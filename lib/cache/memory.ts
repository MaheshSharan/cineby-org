import type { CacheEntry, CacheStats, CacheStore } from "./types";

/**
 * Cineby Bounded In-Memory Cache with LRU eviction and TTL expiration.
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
 * Uses JavaScript Map insertion-order mechanics for O(1) LRU eviction.
 */
export class MemoryCacheStore implements CacheStore {
  readonly name = "memory";

  private map: Map<string, CacheEntry<unknown>>;
  private maxEntries: number;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(maxEntries = 5000) {
    this.maxEntries = Math.max(10, maxEntries);
    this.map = new Map();
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.map.get(key);
    const now = Date.now();

    if (!entry) {
      this.misses += 1;
      return null;
    }

    if (entry.expiresAt <= now) {
      this.map.delete(key);
      this.misses += 1;
      return null;
    }

    // Refresh LRU recency
    this.map.delete(key);
    this.map.set(key, entry);
    this.hits += 1;

    return entry.value as T;
  }

  async getStale<T>(key: string): Promise<{ value: T | null; isStale: boolean }> {
    const entry = this.map.get(key);
    const now = Date.now();

    if (!entry) {
      this.misses += 1;
      return { value: null, isStale: false };
    }

    if (entry.expiresAt <= now) {
      this.map.delete(key);
      this.misses += 1;
      return { value: null, isStale: false };
    }

    // Refresh recency
    this.map.delete(key);
    this.map.set(key, entry);
    this.hits += 1;

    const isStale = entry.staleAfter !== undefined && entry.staleAfter <= now;
    return { value: entry.value as T, isStale };
  }

  async set<T>(key: string, value: T, ttlSeconds: number, staleSeconds?: number): Promise<void> {
    const now = Date.now();
    const expiresAt = now + Math.max(1, ttlSeconds) * 1000;
    const staleAfter = staleSeconds !== undefined ? now + Math.max(1, staleSeconds) * 1000 : undefined;

    // If key exists, delete first to refresh position
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxEntries) {
      // Evict oldest entry (first item in Map)
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
        this.evictions += 1;
      }
    }

    this.map.set(key, { value, expiresAt, staleAfter });
  }

  async delete(key: string): Promise<boolean> {
    return this.map.delete(key);
  }

  async clear(): Promise<void> {
    this.map.clear();
  }

  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.map.size,
      evictions: this.evictions,
    };
  }
}
