import { getCacheStore } from "@/lib/cache";
import { logger } from "@/lib/logger";

const EXHAUSTION_TTL_SECONDS = 60 * 60; // 1 hour

function workerExhaustionKey(workerOrigin: string): string {
  const cleanOrigin = workerOrigin.trim().toLowerCase().replace(/\/+$/, "");
  return `proxy:worker:exhausted:${cleanOrigin}`;
}

/**
 * Mark a stream proxy worker as exhausted (HTTP 429 quota reached) for 1 hour in Redis/CacheStore.
 */
export async function markWorkerExhausted(workerOrigin: string): Promise<void> {
  if (!workerOrigin) return;
  const key = workerExhaustionKey(workerOrigin);
  try {
    await getCacheStore().set(key, true, EXHAUSTION_TTL_SECONDS);
    logger.warn(`[ProxyPool] Worker marked exhausted for 1 hour in Redis: ${workerOrigin}`);
  } catch (err) {
    logger.warn("[ProxyPool] Failed to record worker exhaustion in cache store", undefined, err);
  }
}

/**
 * Check if a stream proxy worker is currently marked as exhausted in Redis/CacheStore.
 */
export async function isWorkerExhausted(workerOrigin: string): Promise<boolean> {
  if (!workerOrigin) return false;
  const key = workerExhaustionKey(workerOrigin);
  try {
    return (await getCacheStore().get<boolean>(key)) === true;
  } catch (err) {
    logger.warn("[ProxyPool] Failed to read worker exhaustion status from cache store", undefined, err);
    return false;
  }
}

/**
 * Filter a pool of worker URLs to only those currently active (not exhausted).
 * If all workers are exhausted, returns an empty array.
 */
export async function getActiveWorkerPool(workerUrls: readonly string[]): Promise<string[]> {
  const active: string[] = [];
  for (const url of workerUrls) {
    const exhausted = await isWorkerExhausted(url);
    if (!exhausted) {
      active.push(url);
    }
  }
  return active;
}
