import { afterEach, describe, expect, it, vi } from "vitest";

import { RedisCacheStore, UpstashRestClient, type RedisClientLike } from "@/lib/cache/redis";

afterEach(() => vi.unstubAllGlobals());

describe("UpstashRestClient", () => {
  it("includes Upstash's explanation when a request is rejected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('{"error":"ERR max data size limit exceeded"}', { status: 400 }))
    );

    const client = new UpstashRestClient("https://example.upstash.io", "token");

    await expect(client.set("key", "value", "EX", 60)).rejects.toThrow(
      "HTTP 400: " + '{"error":"ERR max data size limit exceeded"}'
    );
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
});
