import { getCacheBackend, getCacheMaxEntries, getRedisUrl } from "@/lib/env";
import { logger } from "@/lib/logger";
import { MemoryCacheStore } from "./memory";
import { RedisCacheStore } from "./redis";
import { SingleFlight } from "./singleFlight";
import type { CacheStore } from "./types";

export * from "./types";
export * from "./policy";
export * from "./singleFlight";

/**
 * Cineby Global CacheStore Instance
 *
 * Architecture:
 *                 Cineby
 *                    │
 *                    ▼
 *               CacheStore
 *              /          \
 *             /            \
 *      Memory LRU/TTL     Redis adapter
 *        (NOW)             (LATER)
 */

let globalCacheStore: CacheStore | null = null;
const singleFlight = new SingleFlight();

export function getCacheStore(): CacheStore {
  if (!globalCacheStore) {
    const backend = getCacheBackend();
    if (backend === "redis") {
      globalCacheStore = new RedisCacheStore(getRedisUrl());
    } else {
      globalCacheStore = new MemoryCacheStore(getCacheMaxEntries());
    }
  }
  return globalCacheStore;
}

export interface CachedFetchOptions<T> {
  key: string;
  ttlSeconds: number;
  staleSeconds?: number;
  fetcher: () => Promise<T>;
}

/**
 * High-level cached fetch with request coalescing (single-flight)
 * and optional stale-while-revalidate background refresh.
 *
 * Guaranteed fallback: If cache fails or throws, fetcher is invoked directly.
 * Cache is an optimization, not a point of failure.
 */
export async function cachedFetch<T>({
  key,
  ttlSeconds,
  staleSeconds,
  fetcher,
}: CachedFetchOptions<T>): Promise<T> {
  const store = getCacheStore();

  // 1. Try reading from cache
  try {
    const { value, isStale } = await store.getStale<T>(key);
    if (value !== null) {
      // If stale, trigger background refresh via singleFlight (fire-and-forget)
      if (isStale) {
        void singleFlight
          .do(`bg:${key}`, async () => {
            try {
              const fresh = await fetcher();
              await store.set(key, fresh, ttlSeconds, staleSeconds);
            } catch (err) {
              logger.debug(`Background cache revalidation failed for ${key}`, { error: err });
            }
          })
          .catch(() => {});
      }
      return value;
    }
  } catch (err) {
    logger.warn(`Cache read failure for ${key}; falling back to fetcher`, undefined, err);
  }

  // 2. Cache miss -> Use SingleFlight to coalesce concurrent requests
  return singleFlight.do(key, async () => {
    // Re-check cache inside coalesced executor to avoid redundant upstream calls
    try {
      const cached = await store.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    } catch {
      // Continue to fetcher
    }

    const fresh = await fetcher();

    // Cache the fresh value
    try {
      await store.set(key, fresh, ttlSeconds, staleSeconds);
    } catch (err) {
      logger.warn(`Cache write failure for ${key}`, undefined, err);
    }

    return fresh;
  });
}
