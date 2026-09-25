import type { NextApiRequest, NextApiResponse } from "next";
import type { MediaSegment } from "@/components/player/types";
import { tmdbGet } from "@/lib/tmdb/server/client";
import { fetchSegmentsWithFallback, type SegmentProviderName } from "@/lib/segments";
import { getCacheStore, SingleFlight } from "@/lib/cache";
import { withApiContext } from "@/lib/validation";
import { applyCorsHeaders } from "@/lib/cors";

interface SegmentsResponse {
  segments: MediaSegment[];
  provider?: SegmentProviderName;
  error?: string;
}

interface CachedSegmentsData {
  segments: MediaSegment[];
  provider?: SegmentProviderName;
}

const singleFlight = new SingleFlight();
const CACHE_TTL_SUCCESS_SEC = 60 * 60; // 1 hour for found segments
const CACHE_TTL_EMPTY_SEC = 5 * 60;    // 5 minutes for empty responses
const TMDB_IMDB_TTL_SEC = 24 * 60 * 60; // 24 hours

function parseQueryString(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim() || undefined;
  return undefined;
}

export default withApiContext(
  "api/segments",
  async (req: NextApiRequest, res: NextApiResponse<SegmentsResponse>) => {
    if (applyCorsHeaders(req, res)) {
      return;
    }

    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      res.status(405).json({ segments: [], error: "Method Not Allowed" });
      return;
    }

    const store = getCacheStore();
    const { imdb_id, imdbId, tmdb_id, tmdbId, media_type, mediaType, season, episode, duration } = req.query;
    let cleanImdbId = parseQueryString(imdb_id) ?? parseQueryString(imdbId);
    const rawTmdbId = parseQueryString(tmdb_id) ?? parseQueryString(tmdbId);
    const parsedMediaType = parseQueryString(media_type) ?? parseQueryString(mediaType);
    const rawMediaType = parsedMediaType === "tv" ? "tv" : "movie";

    // If imdb_id is missing, attempt to resolve it via TMDB external_ids using bounded cache & single-flight
    if (!cleanImdbId && rawTmdbId) {
      const tmdbCacheKey = `tmdb_to_imdb:${rawMediaType}:${rawTmdbId}`;
      const cachedImdb = await store.get<string>(tmdbCacheKey);
      if (cachedImdb) {
        cleanImdbId = cachedImdb;
      } else {
        cleanImdbId = (await singleFlight.do(tmdbCacheKey, async () => {
          const recheck = await store.get<string>(tmdbCacheKey);
          if (recheck) return recheck;
          try {
            const ext = await tmdbGet<{ imdb_id?: string | null }>({
              path: `/${rawMediaType}/${rawTmdbId}/external_ids`,
            });
            if (ext?.imdb_id) {
              await store.set(tmdbCacheKey, ext.imdb_id, TMDB_IMDB_TTL_SEC);
              return ext.imdb_id;
            }
          } catch {
            // Fall through
          }
          return undefined;
        })) ?? undefined;
      }
    }

    if (!cleanImdbId) {
      res.status(200).json({ segments: [] });
      return;
    }

    const seasonNum = season ? Number.parseInt(String(season), 10) : undefined;
    const episodeNum = episode ? Number.parseInt(String(episode), 10) : undefined;
    const durationSec = duration ? Number.parseFloat(String(duration)) : undefined;

    const cacheKey = `segments:${cleanImdbId}:${rawMediaType}:${seasonNum ?? 0}:${episodeNum ?? 0}:${
      durationSec ? Math.round(durationSec) : 0
    }`;

    const cached = await store.get<CachedSegmentsData>(cacheKey);
    if (cached) {
      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      res.status(200).json({ segments: cached.segments, provider: cached.provider });
      return;
    }

    try {
      const result = await singleFlight.do(cacheKey, async () => {
        const recheck = await store.get<CachedSegmentsData>(cacheKey);
        if (recheck) return recheck;

        const fetchResult = await fetchSegmentsWithFallback({
          imdbId: cleanImdbId,
          mediaType: rawMediaType,
          season: seasonNum,
          episode: episodeNum,
          duration: durationSec,
        });

        const hasSegments = fetchResult.segments.length > 0;
        const ttl = hasSegments ? CACHE_TTL_SUCCESS_SEC : CACHE_TTL_EMPTY_SEC;
        const data: CachedSegmentsData = {
          segments: fetchResult.segments,
          provider: fetchResult.providerUsed,
        };

        await store.set(cacheKey, data, ttl);
        return data;
      });

      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      res.status(200).json({ segments: result.segments, provider: result.provider });
    } catch {
      res.status(200).json({ segments: [] });
    }
  }
);
