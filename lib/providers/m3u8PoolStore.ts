import { getCacheStore } from "@/lib/cache";
import { logger } from "@/lib/logger";

const EXHAUSTION_TTL_SECONDS = 2 * 60 * 60; // 2 hours

function fetcherExhaustionKey(fetcherOrigin: string): string {
  const clean = fetcherOrigin.trim().toLowerCase().replace(/\/+$/, "");
  return `proxy:m3u8_fetcher:exhausted:${clean}`;
}

/**
 * Mark a Vercel M3U8 fetcher instance as exhausted (e.g. 402 Payment Required or 429) for 2 hours in Redis/cache.
 */
export async function markM3u8FetcherExhausted(fetcherUrl: string): Promise<void> {
  if (!fetcherUrl) return;
  const key = fetcherExhaustionKey(fetcherUrl);
  try {
    await getCacheStore().set(key, true, EXHAUSTION_TTL_SECONDS);
    logger.warn(`[M3U8Pool] Fetcher marked exhausted for 2 hours: ${fetcherUrl}`);
  } catch (err) {
    logger.warn("[M3U8Pool] Failed to record fetcher exhaustion in cache store", undefined, err);
  }
}

/**
 * Check if a Vercel M3U8 fetcher is currently marked exhausted in Redis/cache.
 */
export async function isM3u8FetcherExhausted(fetcherUrl: string): Promise<boolean> {
  if (!fetcherUrl) return false;
  const key = fetcherExhaustionKey(fetcherUrl);
  try {
    return (await getCacheStore().get<boolean>(key)) === true;
  } catch (err) {
    logger.warn("[M3U8Pool] Failed to read fetcher exhaustion status from cache store", undefined, err);
    return false;
  }
}

/**
 * Returns healthy (non-exhausted) fetchers from the candidate pool.
 * If all are exhausted, returns the full candidate pool as fallback.
 */
export async function getActiveM3u8FetcherPool(candidateUrls: readonly string[]): Promise<string[]> {
  if (!candidateUrls || candidateUrls.length === 0) return [];
  const active: string[] = [];
  for (const url of candidateUrls) {
    const exhausted = await isM3u8FetcherExhausted(url);
    if (!exhausted) {
      active.push(url);
    }
  }
  return active.length > 0 ? active : [...candidateUrls];
}

let roundRobinCounter = 0;

/**
 * Select next healthy fetcher URL from candidate pool via round-robin.
 */
export async function selectM3u8FetcherUrl(candidateUrls: readonly string[]): Promise<string> {
  const pool = await getActiveM3u8FetcherPool(candidateUrls);
  if (pool.length === 0) {
    return candidateUrls[0] || "";
  }
  const index = Math.abs(roundRobinCounter++) % pool.length;
  return pool[index];
}
