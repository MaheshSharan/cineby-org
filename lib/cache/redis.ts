import type { CacheStats, CacheStore } from "./types";
import { MemoryCacheStore } from "./memory";
import { getCacheMaxEntries, getUpstashRedisRestToken, getUpstashRedisRestUrl } from "@/lib/env/server";
import { logger } from "@/lib/logger";

/**
 * Cineby Redis Cache Adapter (Upstash REST & Native Redis Compatible)
 *
 * Architecture:
 *                 Cineby
 *                    │
 *                    ▼
 *               CacheStore
 *              /          \
 *             /            \
 *      Memory LRU/TTL     Upstash REST / Redis
 *        (Fallback)            (Primary)
 *
 * Designed to seamlessly run on Edge / Cloudflare Workers using lightweight native fetch,
 * or connect with standard Redis client protocol without heavy TCP dependencies.
 *
 * If Redis is selected but unconfigured or fails, it gracefully falls back to MemoryCacheStore
 * and logs warnings rather than crashing Cineby.
 */
export interface RedisClientLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<unknown>;
  del(key: string): Promise<number>;
  flushdb?(): Promise<unknown>;
}

export class UpstashRestClient implements RedisClientLike {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url.replace(/\/+$/, "");
    this.token = token;
  }

  private async executeCommand<T>(command: (string | number)[]): Promise<T | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`[UpstashRestClient] Request failed with HTTP ${res.status}`);
      }

      const data = (await res.json()) as { result?: T; error?: string };
      if (data.error) {
        throw new Error(`[UpstashRestClient] Redis error: ${data.error}`);
      }

      return data.result ?? null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async get(key: string): Promise<string | null> {
    const res = await this.executeCommand<unknown>(["GET", key]);
    if (res === null || res === undefined) return null;
    return typeof res === "string" ? res : JSON.stringify(res);
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<unknown> {
    const cmd: (string | number)[] = ["SET", key, value];
    if (mode && duration !== undefined) {
      cmd.push(mode, duration);
    }
    return this.executeCommand(cmd);
  }

  async del(key: string): Promise<number> {
    const res = await this.executeCommand<number>(["DEL", key]);
    return typeof res === "number" ? res : 0;
  }

  async flushdb(): Promise<unknown> {
    return this.executeCommand(["FLUSHDB"]);
  }
}

export class RedisCacheStore implements CacheStore {
  readonly name = "redis";
  private client: RedisClientLike | null = null;
  private fallbackStore: CacheStore;

  /**
   * Upstash credentials are required: selecting the redis backend without them throws instead of
   * silently degrading to memory. `fallbackStore` only covers runtime Redis request failures.
   */
  constructor(client?: RedisClientLike, fallbackStore?: CacheStore) {
    this.fallbackStore = fallbackStore ?? new MemoryCacheStore(getCacheMaxEntries());
    this.client = client ?? new UpstashRestClient(getUpstashRedisRestUrl(), getUpstashRedisRestToken());
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
        return null;
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
        return { value: null, isStale: false };
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
        await this.client.set(key, payload, "EX", Math.max(1, ttlSeconds));
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
