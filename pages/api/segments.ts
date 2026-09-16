import type { NextApiRequest, NextApiResponse } from "next";
import type { MediaSegment, SegmentType } from "@/components/player/types";
import { tmdbGet } from "@/lib/tmdb/server/client";

interface SkipDbSegmentRaw {
  start_ms: number;
  end_ms?: number;
  match?: string;
  adjusted?: boolean;
  offset_ms?: number;
  confidence?: number;
}

interface SkipDbApiResponse {
  imdb_id: string;
  season?: number;
  episode?: number;
  segments?: {
    intro?: SkipDbSegmentRaw | null;
    recap?: SkipDbSegmentRaw | null;
    outro?: SkipDbSegmentRaw | null;
    preview?: SkipDbSegmentRaw | null;
  };
  intro_length_estimate_ms?: number | null;
}

interface SegmentsResponse {
  segments: MediaSegment[];
  error?: string;
}

// In-memory cache for segment data (TTL: 1 hour)
const segmentCache = new Map<string, { segments: MediaSegment[]; expiresAt: number }>();
const tmdbToImdbCache = new Map<string, string>();
const CACHE_TTL_MS = 60 * 60 * 1000;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SegmentsResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ segments: [], error: "Method Not Allowed" });
  }

  const { imdb_id, imdbId, tmdb_id, tmdbId, media_type, mediaType, season, episode, duration } = req.query;
  let cleanImdbId = ((imdb_id || imdbId) as string | undefined)?.trim();
  const rawTmdbId = (tmdb_id || tmdbId) as string | undefined;
  const rawMediaType = ((media_type || mediaType) as string | undefined) === "tv" ? "tv" : "movie";

  // If imdb_id is missing, attempt to resolve it via TMDB external_ids
  if (!cleanImdbId && rawTmdbId) {
    const tmdbCacheKey = `${rawMediaType}-${rawTmdbId}`;
    if (tmdbToImdbCache.has(tmdbCacheKey)) {
      cleanImdbId = tmdbToImdbCache.get(tmdbCacheKey);
    } else {
      try {
        const ext = await tmdbGet<{ imdb_id?: string | null }>({
          path: `/${rawMediaType}/${rawTmdbId}/external_ids`,
        });
        if (ext?.imdb_id) {
          cleanImdbId = ext.imdb_id;
          tmdbToImdbCache.set(tmdbCacheKey, cleanImdbId);
        }
      } catch {
        // Fall through
      }
    }
  }

  if (!cleanImdbId) {
    return res.status(200).json({ segments: [] });
  }
  const seasonNum = season ? Number.parseInt(String(season), 10) : undefined;
  const episodeNum = episode ? Number.parseInt(String(episode), 10) : undefined;
  const durationSec = duration ? Number.parseFloat(String(duration)) : undefined;

  const cacheKey = `${cleanImdbId}-${seasonNum ?? 0}-${episodeNum ?? 0}-${durationSec ? Math.round(durationSec) : 0}`;
  const cached = segmentCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({ segments: cached.segments });
  }

  const apiKey = process.env.SKIPDB_API_KEY;
  const baseUrl = process.env.SKIPDB_API_URL?.replace(/\/+$/, "") || "https://api.skipdb.tv";

  const url = new URL(`${baseUrl}/api/segments`);
  url.searchParams.set("imdb_id", cleanImdbId);
  url.searchParams.set("adjust", "conservative");

  if (typeof seasonNum === "number" && Number.isInteger(seasonNum) && seasonNum > 0) {
    url.searchParams.set("season", String(seasonNum));
  }
  if (typeof episodeNum === "number" && Number.isInteger(episodeNum) && episodeNum > 0) {
    url.searchParams.set("episode", String(episodeNum));
  }
  if (typeof durationSec === "number" && Number.isFinite(durationSec) && durationSec > 0) {
    url.searchParams.set("duration", String(Math.round(durationSec)));
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "Cineby/1.0",
  };

  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const apiRes = await fetch(url.toString(), {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!apiRes.ok) {
      return res.status(200).json({ segments: [] });
    }

    const data: unknown = await apiRes.json().catch(() => null);
    if (!data || typeof data !== "object") {
      return res.status(200).json({ segments: [] });
    }

    const payload = data as SkipDbApiResponse;
    const rawSegments = payload.segments;
    if (!rawSegments) {
      return res.status(200).json({ segments: [] });
    }

    const parsedSegments: MediaSegment[] = [];
    const types: SegmentType[] = ["intro", "recap", "outro", "preview"];

    for (const type of types) {
      const seg = rawSegments[type];
      if (!seg || typeof seg.start_ms !== "number") continue;

      const start = seg.start_ms / 1000;
      let end = typeof seg.end_ms === "number" ? seg.end_ms / 1000 : 0;

      // Outro can omit end_ms when it continues through to the stream duration
      if (type === "outro" && end <= start && durationSec && durationSec > start) {
        end = durationSec;
      }

      // Valid segments must have positive length
      if (end > start) {
        parsedSegments.push({
          type,
          start,
          end,
        });
      }
    }

    // Cache results
    segmentCache.set(cacheKey, {
      segments: parsedSegments,
      expiresAt: now + CACHE_TTL_MS,
    });

    // Prune stale cache entries occasionally if map grows large
    if (segmentCache.size > 2000) {
      for (const [key, value] of segmentCache) {
        if (value.expiresAt <= now) {
          segmentCache.delete(key);
        }
      }
    }

    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({ segments: parsedSegments });
  } catch {
    // Network or timeout errors return empty segments gracefully
    return res.status(200).json({ segments: [] });
  }
}
