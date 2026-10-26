import type { CacheStats, CacheStore } from "./types";
import { MemoryCacheStore } from "./memory";
import {
  getCacheMaxEntries,
  getRedisUrl,
} from "@/lib/env/server";
import { logger } from "@/lib/logger";
import Redis from "ioredis";

/**
 * Cineby Redis Cache Adapter (Local TCP Redis)
 *
 * Architecture:
 *                 Cineby
 *                    │
 *                    ▼
 *               CacheStore
 *              /          \
 *             /            \
 *      Memory LRU/TTL     Local Redis (TCP)
 *        (Fallback)          (Primary)
 */
// Larger cache entries stay in memory only, so a few heavy titles cannot fill the Redis buffer.
const MAX_REDIS_VALUE_CHARS = 100_000;

export interface RedisClientLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<unknown>;
  del(key: string): Promise<number>;
  flushdb?(): Promise<unknown>;
}

export class NativeRedisClient implements RedisClientLike {
  private redis: Redis;

  constructor(url: string) {
    this.redis = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      enableOfflineQueue: false,
    });
    this.redis.on("error", (err) => {
      logger.warn("[NativeRedisClient] Redis connection error", undefined, err);
    });
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<unknown> {
    if (mode === "EX" && duration !== undefined) {
      return this.redis.set(key, value, "EX", duration);
    }
    return this.redis.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  async flushdb(): Promise<unknown> {
    return this.redis.flushdb();
  }
}

export class RedisCacheStore implements CacheStore {
  readonly name = "redis";
  private client: RedisClientLike | null = null;
  private fallbackStore: CacheStore;

  constructor(client?: RedisClientLike, fallbackStore?: CacheStore) {
    this.fallbackStore = fallbackStore ?? new MemoryCacheStore(getCacheMaxEntries());

    if (client) {
      this.client = client;
      return;
    }

    const redisUrl = getRedisUrl();
    if (redisUrl) {
      this.client = new NativeRedisClient(redisUrl);
      return;
    }

    logger.warn("[RedisCacheStore] REDIS_URL not configured, falling back to memory");
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.client) {
      try {
        const raw = await this.client.get(key);
        if (raw !== null && raw !== undefined) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object" && "value" in parsed) {
              return (parsed as { value: T }).value;
            }
            return parsed as T;
          } catch {
            return raw as unknown as T;
          }
        }
      } catch (error) {
        logger.warn(`[RedisCacheStore] Failed to read key ${key} from Redis, falling back to memory`, undefined, error);
      }
    }
    return this.fallbackStore.get<T>(key);
  }

  async getStale<T>(key: string): Promise<{ value: T | null; isStale: boolean }> {
    if (this.client) {
      try {
        const raw = await this.client.get(key);
        if (raw !== null && raw !== undefined) {
          try {
            const parsed = JSON.parse(raw);
            let value: T;
            let staleAfter: number | undefined;
            if (parsed && typeof parsed === "object" && "value" in parsed) {
              value = (parsed as { value: T }).value;
              staleAfter = (parsed as { staleAfter?: number }).staleAfter;
            } else {
              value = parsed as T;
            }
            const isStale = staleAfter !== undefined && staleAfter <= Date.now();
            return { value, isStale };
          } catch {
            return { value: raw as unknown as T, isStale: false };
          }
        }
      } catch (error) {
        logger.warn(`[RedisCacheStore] Failed to get stale key ${key} from Redis, falling back to memory`, undefined, error);
      }
    }
    return this.fallbackStore.getStale<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds: number, staleSeconds?: number): Promise<void> {
    if (this.client) {
      try {
        const staleAfter = staleSeconds !== undefined ? Date.now() + staleSeconds * 1000 : undefined;
        const payload = JSON.stringify({ value, staleAfter });
        if (payload.length > MAX_REDIS_VALUE_CHARS) {
          logger.debug(`[RedisCacheStore] Skipping Redis write for ${key}: ${payload.length} chars exceeds limit`);
        } else {
          await this.client.set(key, payload, "EX", Math.max(1, ttlSeconds));
        }
      } catch (error) {
        logger.warn(`[RedisCacheStore] Failed to set key ${key} in Redis, falling back to memory`, undefined, error);
      }
    }
    try {
      await this.fallbackStore.set(key, value, ttlSeconds, staleSeconds);
    } catch (fallbackError) {
      logger.warn(`[RedisCacheStore] Failed to write key ${key} to fallback memory store`, undefined, fallbackError);
    }
  }

  async delete(key: string): Promise<boolean> {
    let redisDeleted = false;
    if (this.client) {
      try {
        const count = await this.client.del(key);
        redisDeleted = count > 0;
      } catch (error) {
        logger.warn(`[RedisCacheStore] Failed to delete key ${key} from Redis`, undefined, error);
      }
    }
    const memDeleted = await this.fallbackStore.delete(key);
    return redisDeleted || memDeleted;
  }

  async clear(): Promise<void> {
    if (this.client?.flushdb) {
      try {
        await this.client.flushdb();
      } catch (error) {
        logger.warn("[RedisCacheStore] Failed to clear Redis cache", undefined, error);
      }
    }
    await this.fallbackStore.clear();
  }

  getStats(): CacheStats {
    return this.fallbackStore.getStats?.() ?? { hits: 0, misses: 0, size: 0, evictions: 0 };
  }
}
