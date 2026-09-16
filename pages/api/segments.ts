import type { NextApiRequest, NextApiResponse } from "next";
import type { MediaSegment } from "@/components/player/types";
import { tmdbGet } from "@/lib/tmdb/server/client";
import { fetchSegmentsWithFallback, type SegmentProviderName } from "@/lib/segments";

interface SegmentsResponse {
  segments: MediaSegment[];
  provider?: SegmentProviderName;
  error?: string;
}

// In-memory cache for segment data
const segmentCache = new Map<
  string,
  { segments: MediaSegment[]; provider?: SegmentProviderName; expiresAt: number }
>();
const tmdbToImdbCache = new Map<string, string>();
const CACHE_TTL_SUCCESS_MS = 60 * 60 * 1000; // 1 hour for found segments
const CACHE_TTL_EMPTY_MS = 5 * 60 * 1000;    // 5 minutes for empty responses

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

  const cacheKey = `${cleanImdbId}-${rawMediaType}-${seasonNum ?? 0}-${episodeNum ?? 0}-${
    durationSec ? Math.round(durationSec) : 0
  }`;
  const cached = segmentCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({ segments: cached.segments, provider: cached.provider });
  }

  try {
    const result = await fetchSegmentsWithFallback({
      imdbId: cleanImdbId,
      mediaType: rawMediaType,
      season: seasonNum,
      episode: episodeNum,
      duration: durationSec,
    });

    const hasSegments = result.segments.length > 0;
    const ttl = hasSegments ? CACHE_TTL_SUCCESS_MS : CACHE_TTL_EMPTY_MS;

    segmentCache.set(cacheKey, {
      segments: result.segments,
      provider: result.providerUsed,
      expiresAt: now + ttl,
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
    return res.status(200).json({ segments: result.segments, provider: result.providerUsed });
  } catch {
    return res.status(200).json({ segments: [] });
  }
}
