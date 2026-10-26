import { afterEach, describe, expect, it, vi } from "vitest";

import { RedisCacheStore, NativeRedisClient, type RedisClientLike } from "@/lib/cache/redis";

afterEach(() => vi.unstubAllGlobals());

describe("NativeRedisClient", () => {
  it("initializes with Redis URL", () => {
    const client = new NativeRedisClient("redis://localhost:6379");
    expect(client).toBeDefined();
    expect(typeof client.get).toBe("function");
    expect(typeof client.set).toBe("function");
    expect(typeof client.del).toBe("function");
  });
});

describe("RedisCacheStore size limit", () => {
  function fakeClient() {
    const writes: string[] = [];
    const client: RedisClientLike = {
      get: async () => null,
      set: async (key) => {
        writes.push(key);
        return "OK";
      },
      del: async () => 0,
    };

    return { client, writes };
  }

  it("writes normal entries to Redis", async () => {
    const { client, writes } = fakeClient();
    await new RedisCacheStore(client).set("small", { title: "Dune" }, 60);

    expect(writes).toEqual(["small"]);
  });

  it("keeps oversized entries out of Redis but still serves them from memory", async () => {
    const { client, writes } = fakeClient();
    const store = new RedisCacheStore(client);
    const huge = { blob: "x".repeat(150_000) };

    await store.set("huge", huge, 60);

    expect(writes).toEqual([]);
    expect(await store.get<typeof huge>("huge")).toEqual(huge);
  });

  it("handles get, getStale, and delete operations via client", async () => {
    const dataStore: Record<string, string> = {
      "key1": JSON.stringify({ value: "test-val", staleAfter: Date.now() + 100000 }),
      "key2": JSON.stringify({ value: "stale-val", staleAfter: Date.now() - 1000 }),
    };

    const client: RedisClientLike = {
      get: async (key) => dataStore[key] ?? null,
      set: async (key, val) => {
        dataStore[key] = val;
        return "OK";
      },
      del: async (key) => {
        if (key in dataStore) {
          delete dataStore[key];
          return 1;
        }
        return 0;
      },
      flushdb: async () => {
        for (const k of Object.keys(dataStore)) delete dataStore[k];
        return "OK";
      },
    };

    const store = new RedisCacheStore(client);

    expect(await store.get("key1")).toBe("test-val");

    const staleResult = await store.getStale<string>("key2");
    expect(staleResult.value).toBe("stale-val");
    expect(staleResult.isStale).toBe(true);

    const deleted = await store.delete("key1");
    expect(deleted).toBe(true);
    expect(await store.get("key1")).toBeNull();

    await store.clear();
    expect(await store.get("key2")).toBeNull();
  });

  it("gracefully falls back to memory store when client throws errors", async () => {
    const failingClient: RedisClientLike = {
      get: async () => {
        throw new Error("Redis connection refused");
      },
      set: async () => {
        throw new Error("Redis write failure");
      },
      del: async () => {
        throw new Error("Redis delete failure");
      },
    };

    const store = new RedisCacheStore(failingClient);

    // Set should fall back to memory
    await store.set("fallbackKey", "fallbackValue", 60);

    // Get will fail in Redis and fall back to memory
    expect(await store.get("fallbackKey")).toBe("fallbackValue");

    // Delete should still delete from memory
    const deleted = await store.delete("fallbackKey");
    expect(deleted).toBe(true);
    expect(await store.get("fallbackKey")).toBeNull();
  });
});
