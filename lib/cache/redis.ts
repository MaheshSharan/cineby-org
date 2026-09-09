import type { CacheStats, CacheStore } from "./types";
import { logger } from "@/lib/logger";

/**
 * Cineby Redis Cache Adapter (LATER / Optional Future Backend)
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
 *
 * Designed to seamlessly plug in when a Redis client (e.g. ioredis, @upstash/redis, or node-redis)
 * is configured, without changing any application code or business logic.
 *
 * If Redis is selected but unconfigured or fails, it gracefully fails closed/open
 * and logs warnings rather than crashing Cineby.
 */
export interface RedisClientLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<unknown>;
  del(key: string): Promise<number>;
  flushdb?(): Promise<unknown>;
}

export class RedisCacheStore implements CacheStore {
  readonly name = "redis";
  private client: RedisClientLike | null = null;
  private redisUrl?: string;

  constructor(redisUrl?: string, client?: RedisClientLike) {
    this.redisUrl = redisUrl;
    this.client = client ?? null;

    if (!this.client && !this.redisUrl) {
      logger.warn("[RedisCacheStore] Redis backend selected but REDIS_URL is not configured.");
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { value: T };
      return parsed.value;
    } catch (error) {
      logger.warn(`[RedisCacheStore] Failed to read key ${key}`, undefined, error);
      return null;
    }
  }

  async getStale<T>(key: string): Promise<{ value: T | null; isStale: boolean }> {
    if (!this.client) return { value: null, isStale: false };
    try {
      const raw = await this.client.get(key);
      if (!raw) return { value: null, isStale: false };
      const parsed = JSON.parse(raw) as { value: T; staleAfter?: number };
      const isStale = parsed.staleAfter !== undefined && parsed.staleAfter <= Date.now();
      return { value: parsed.value, isStale };
    } catch (error) {
      logger.warn(`[RedisCacheStore] Failed to get stale key ${key}`, undefined, error);
      return { value: null, isStale: false };
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number, staleSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      const staleAfter = staleSeconds !== undefined ? Date.now() + staleSeconds * 1000 : undefined;
      const payload = JSON.stringify({ value, staleAfter });
      await this.client.set(key, payload, "EX", Math.max(1, ttlSeconds));
    } catch (error) {
      logger.warn(`[RedisCacheStore] Failed to set key ${key}`, undefined, error);
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const count = await this.client.del(key);
      return count > 0;
    } catch (error) {
      logger.warn(`[RedisCacheStore] Failed to delete key ${key}`, undefined, error);
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.client?.flushdb) return;
    try {
      await this.client.flushdb();
    } catch (error) {
      logger.warn("[RedisCacheStore] Failed to clear Redis cache", undefined, error);
    }
  }

  getStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      size: 0,
      evictions: 0,
    };
  }
}
