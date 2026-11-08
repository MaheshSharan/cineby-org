import type { CacheStore, CacheStats } from "./types";
import { MemoryCacheStore } from "./memory";
import { isKvPersistedKey } from "./keys";
import { logger } from "@/lib/logger";

export interface KVNamespaceBinding {
  get(key: string, type?: "text" | "json" | "arrayBuffer" | "stream"): Promise<unknown>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

// A value read from KV is kept in memory briefly so repeat reads in this isolate cost no KV read.
const KV_HIT_MEMORY_TTL_SECONDS = 5 * 60;
// KV rejects expiration TTLs below 60 seconds.
const KV_MIN_TTL_SECONDS = 60;

function getUtcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Two-level cache: isolate memory first, shared KV second.
 *
 * KV free-tier read and write allowances reset at 00:00 UTC. After a limit error this store stays in
 * memory-only mode until the UTC day changes, then tries KV again.
 */
export class KVCacheStore implements CacheStore {
  readonly name = "kv";
  private hits = 0;
  private misses = 0;
  private kvExhaustedOnDay: string | null = null;
  private memoryFallback: MemoryCacheStore;

  constructor(private kv: KVNamespaceBinding) {
    this.memoryFallback = new MemoryCacheStore(5000);
  }

  private isKvExhausted(): boolean {
    return this.kvExhaustedOnDay === getUtcDay();
  }

  private checkLimitError(err: unknown): boolean {
    if (err instanceof Error && err.message.toLowerCase().includes("limit exceeded")) {
      if (!this.isKvExhausted()) {
        this.kvExhaustedOnDay = getUtcDay();
        logger.warn("[KVCacheStore] KV quota exceeded for the day. Switching to in-memory cache until 00:00 UTC.");
      }
      return true;
    }
    return false;
  }

  async get<T>(key: string): Promise<T | null> {
    const { value } = await this.getStale<T>(key);
    return value;
  }

  async getStale<T>(key: string): Promise<{ value: T | null; isStale: boolean }> {
    const local = await this.memoryFallback.getStale<T>(key);
    if (local.value !== null) {
      this.hits++;
      return local;
    }

    if (this.isKvExhausted() || !isKvPersistedKey(key)) {
      this.misses++;
      return local;
    }

    try {
      const data = await this.kv.get(key, "json");
      if (data !== null && data !== undefined) {
        this.hits++;
        await this.memoryFallback.set(key, data as T, KV_HIT_MEMORY_TTL_SECONDS);
        return { value: data as T, isStale: false };
      }
    } catch (err) {
      this.checkLimitError(err);
      logger.warn(`[KVCacheStore] Read failure for key: ${key}`, undefined, err);
    }

    this.misses++;
    return { value: null, isStale: false };
  }

  async set<T>(key: string, value: T, ttlSeconds: number, staleSeconds?: number): Promise<void> {
    await this.memoryFallback.set(key, value, ttlSeconds, staleSeconds);

    if (this.isKvExhausted() || !isKvPersistedKey(key)) {
      return;
    }

    try {
      await this.kv.put(key, JSON.stringify(value), {
        expirationTtl: Math.max(KV_MIN_TTL_SECONDS, ttlSeconds),
      });
    } catch (err) {
      this.checkLimitError(err);
      logger.warn(`[KVCacheStore] Write failure for key: ${key}`, undefined, err);
    }
  }

  async delete(key: string): Promise<boolean> {
    await this.memoryFallback.delete(key);
    if (this.isKvExhausted() || !isKvPersistedKey(key)) {
      return true;
    }

    try {
      await this.kv.delete(key);
      return true;
    } catch (err) {
      this.checkLimitError(err);
      logger.warn(`[KVCacheStore] Delete failure for key: ${key}`, undefined, err);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.memoryFallback.clear();
  }

  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.memoryFallback.getStats().size,
      evictions: this.memoryFallback.getStats().evictions,
    };
  }
}
