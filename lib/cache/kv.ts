import type { CacheStore, CacheStats } from "./types";
import { MemoryCacheStore } from "./memory";
import { logger } from "@/lib/logger";

export interface KVNamespaceBinding {
  get(key: string, type?: "text" | "json" | "arrayBuffer" | "stream"): Promise<unknown>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export class KVCacheStore implements CacheStore {
  readonly name = "kv";
  private hits = 0;
  private misses = 0;
  private isKvExhausted = false;
  private memoryFallback: MemoryCacheStore;

  constructor(private kv: KVNamespaceBinding) {
    this.memoryFallback = new MemoryCacheStore(5000);
  }

  private checkLimitError(err: unknown): boolean {
    if (err instanceof Error && err.message.toLowerCase().includes("limit exceeded")) {
      if (!this.isKvExhausted) {
        this.isKvExhausted = true;
        logger.warn("[KVCacheStore] KV quota exceeded for the day. Seamlessly switching to in-memory cache store.");
      }
      return true;
    }
    return false;
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isKvExhausted) {
      return this.memoryFallback.get<T>(key);
    }

    try {
      const data = await this.kv.get(key, "json");
      if (data !== null && data !== undefined) {
        this.hits++;
        // Keep in memory fallback as well
        void this.memoryFallback.set(key, data as T, 3600);
        return data as T;
      }
      this.misses++;
      return this.memoryFallback.get<T>(key);
    } catch (err) {
      this.misses++;
      this.checkLimitError(err);
      logger.warn(`[KVCacheStore] Read failure for key: ${key}`, undefined, err);
      return this.memoryFallback.get<T>(key);
    }
  }

  async getStale<T>(key: string): Promise<{ value: T | null; isStale: boolean }> {
    const val = await this.get<T>(key);
    return { value: val, isStale: false };
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    // Always store in memory fallback
    await this.memoryFallback.set(key, value, ttlSeconds);

    if (this.isKvExhausted) {
      return;
    }

    try {
      const json = JSON.stringify(value);
      // KV min expirationTtl is 60s
      const effectiveTtl = Math.max(60, ttlSeconds);
      await this.kv.put(key, json, { expirationTtl: effectiveTtl });
    } catch (err) {
      this.checkLimitError(err);
      logger.warn(`[KVCacheStore] Write failure for key: ${key}`, undefined, err);
    }
  }

  async delete(key: string): Promise<boolean> {
    await this.memoryFallback.delete(key);
    if (this.isKvExhausted) {
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
    if (this.isKvExhausted) {
      return this.memoryFallback.getStats();
    }
    return {
      hits: this.hits,
      misses: this.misses,
      size: 0,
      evictions: 0,
    };
  }
}
