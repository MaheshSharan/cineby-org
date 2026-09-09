/**
 * Cineby Cache Abstraction
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

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  staleAfter?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
}

export interface CacheStore {
  readonly name: string;
  get<T>(key: string): Promise<T | null>;
  getStale<T>(key: string): Promise<{ value: T | null; isStale: boolean }>;
  set<T>(key: string, value: T, ttlSeconds: number, staleSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getStats?(): CacheStats;
}
