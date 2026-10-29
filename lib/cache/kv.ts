import type { CacheStore, CacheStats } from "./types";
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

  constructor(private kv: KVNamespaceBinding) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.kv.get(key, "json");
      if (data !== null && data !== undefined) {
        this.hits++;
        return data as T;
      }
      this.misses++;
      return null;
    } catch (err) {
      this.misses++;
      logger.warn(`[KVCacheStore] Read failure for key: ${key}`, undefined, err);
      return null;
    }
  }

  async getStale<T>(key: string): Promise<{ value: T | null; isStale: boolean }> {
    const val = await this.get<T>(key);
    return { value: val, isStale: false };
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const json = JSON.stringify(value);
      // KV min expirationTtl is 60s
      const effectiveTtl = Math.max(60, ttlSeconds);
      await this.kv.put(key, json, { expirationTtl: effectiveTtl });
    } catch (err) {
      logger.warn(`[KVCacheStore] Write failure for key: ${key}`, undefined, err);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.kv.delete(key);
      return true;
    } catch (err) {
      logger.warn(`[KVCacheStore] Delete failure for key: ${key}`, undefined, err);
      return false;
    }
  }

  async clear(): Promise<void> {
    // KV clear is not directly supported without listing keys; best effort no-op
  }

  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: 0,
      evictions: 0,
    };
  }
}
