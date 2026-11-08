import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KVCacheStore, type KVNamespaceBinding } from "@/lib/cache/kv";
import { isKvPersistedKey, tmdbCacheKeys } from "@/lib/cache/keys";

class FakeKv implements KVNamespaceBinding {
  readonly store = new Map<string, string>();
  reads = 0;
  writes = 0;
  failWithLimit = false;

  async get(key: string): Promise<unknown> {
    this.reads++;
    if (this.failWithLimit) throw new Error("KV GET failed: limit exceeded");
    const raw = this.store.get(key);
    return raw === undefined ? null : JSON.parse(raw);
  }

  async put(key: string, value: string | ArrayBuffer | ReadableStream): Promise<void> {
    this.writes++;
    if (this.failWithLimit) throw new Error("KV PUT failed: limit exceeded");
    this.store.set(key, String(value));
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe("shared KV key rule", () => {
  it("stores only widely reused lists in shared KV", () => {
    expect(isKvPersistedKey(tmdbCacheKeys.trending("all", "week", 1))).toBe(true);
    expect(isKvPersistedKey(tmdbCacheKeys.genres("movie"))).toBe(true);
    expect(isKvPersistedKey(tmdbCacheKeys.discover("movie", "page=1"))).toBe(true);
    expect(isKvPersistedKey(tmdbCacheKeys.popularMovies(1))).toBe(true);
    expect(isKvPersistedKey(tmdbCacheKeys.topRatedTv(2))).toBe(true);

    expect(isKvPersistedKey(tmdbCacheKeys.movieDetails(550))).toBe(false);
    expect(isKvPersistedKey(tmdbCacheKeys.tvDetails(1399))).toBe(false);
    expect(isKvPersistedKey(tmdbCacheKeys.seasonEpisodes(1399, 1))).toBe(false);
    expect(isKvPersistedKey(tmdbCacheKeys.search("dune", 1))).toBe(false);
  });
});

describe("KVCacheStore", () => {
  const listKey = tmdbCacheKeys.trending("all", "week", 1);
  const detailKey = tmdbCacheKeys.movieDetails(550);
  let kv: FakeKv;
  let store: KVCacheStore;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T12:00:00Z"));
    kv = new FakeKv();
    store = new KVCacheStore(kv);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes shared lists to KV and keeps per-title data out of it", async () => {
    await store.set(listKey, { page: 1 }, 3600);
    await store.set(detailKey, { id: 550 }, 3600);

    expect(kv.writes).toBe(1);
    expect(kv.store.has(listKey)).toBe(true);
    expect(await store.get(detailKey)).toEqual({ id: 550 });
  });

  it("answers repeat reads from memory without touching KV", async () => {
    await store.set(listKey, { page: 1 }, 3600);

    await store.get(listKey);
    await store.get(listKey);

    expect(kv.reads).toBe(0);
  });

  it("reads KV once for a shared list this isolate has not seen, then serves it from memory", async () => {
    kv.store.set(listKey, JSON.stringify({ page: 9 }));

    expect(await store.get(listKey)).toEqual({ page: 9 });
    expect(await store.get(listKey)).toEqual({ page: 9 });
    expect(kv.reads).toBe(1);
  });

  it("does not read KV for per-title keys", async () => {
    expect(await store.get(detailKey)).toBeNull();
    expect(kv.reads).toBe(0);
  });

  it("stops using KV after a limit error and tries it again the next UTC day", async () => {
    kv.failWithLimit = true;
    await store.set(listKey, { page: 1 }, 3600);
    expect(kv.writes).toBe(1);

    await store.set(tmdbCacheKeys.genres("tv"), { genres: [] }, 3600);
    expect(kv.writes).toBe(1);

    kv.failWithLimit = false;
    vi.setSystemTime(new Date("2026-11-05T00:00:01Z"));
    await store.set(tmdbCacheKeys.genres("movie"), { genres: [] }, 3600);

    expect(kv.writes).toBe(2);
  });

  it("keeps serving from memory while KV is exhausted", async () => {
    kv.failWithLimit = true;
    await store.set(listKey, { page: 1 }, 3600);

    expect(await store.get(listKey)).toEqual({ page: 1 });
  });
});
