import { appCacheKeys, getCacheStore, refreshAfter, storeTtl } from "@/lib/cache";
import { getTrailerApiUrl } from "@/lib/env/public";
import { logger } from "@/lib/logger";
import type { TrailerResponse } from "./trailer";

const IMDB_ID_REGEX = /^tt\d+$/i;

/**
 * Server-side trailer resolver with Redis/memory caching and fallback protection.
 * Cache lifetimes come from the `trailer` and `trailerMiss` profiles.
 */
export async function fetchTrailerUrlServer(imdbId?: string | null): Promise<string | null> {
  if (!imdbId || !IMDB_ID_REGEX.test(imdbId.trim())) {
    return null;
  }

  const normalizedId = imdbId.trim().toLowerCase();
  const cacheKey = appCacheKeys.trailer(normalizedId);
  const store = getCacheStore();

  try {
    const cached = await store.get<{ url: string | null }>(cacheKey);
    if (cached !== null) {
      return cached.url;
    }
  } catch {
    // Cache lookup failed — proceed to fetcher
  }

  const endpoint = getTrailerApiUrl();

  try {
    const res = await fetch(`${endpoint}?id=${encodeURIComponent(normalizedId)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Cineby/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      await store.set(cacheKey, { url: null }, storeTtl("trailerMiss")).catch(() => {});
      return null;
    }

    const data = (await res.json()) as TrailerResponse;
    const streams = data?.trailer?.streams ?? [];
    if (streams.length === 0) {
      await store.set(cacheKey, { url: null }, storeTtl("trailerMiss")).catch(() => {});
      return null;
    }

    const mp4Streams = streams.filter(
      (s) => s.mimeType.toUpperCase() === "MP4" || s.url.includes(".mp4")
    );
    const candidates = mp4Streams.length > 0 ? mp4Streams : streams;
    const preferredOrder = ["1080p", "720p", "480p", "SD"];
    let resolvedUrl: string | null = null;

    for (const q of preferredOrder) {
      const match = candidates.find((s) => s.quality.toLowerCase() === q.toLowerCase());
      if (match?.url) {
        resolvedUrl = match.url;
        break;
      }
    }

    if (!resolvedUrl) {
      resolvedUrl = candidates[0]?.url ?? null;
    }

    await store
      .set(
        cacheKey,
        { url: resolvedUrl },
        resolvedUrl ? storeTtl("trailer") : storeTtl("trailerMiss"),
        resolvedUrl ? refreshAfter("trailer") : undefined
      )
      .catch(() => {});

    return resolvedUrl;
  } catch (error) {
    logger.debug("[trailer] Upstream lookup failed", { imdbId: normalizedId, error: String(error) });
    await store.set(cacheKey, { url: null }, storeTtl("trailerMiss")).catch(() => {});
    return null;
  }
}
