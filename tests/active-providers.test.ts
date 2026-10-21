import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const providersResponse = () =>
  new Response(JSON.stringify({ providers: [{ id: "vidy", name: "Vidy" }] }), { status: 200 });

describe("fetchActiveProviders", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it("shares one request between callers", async () => {
    const fetchMock = vi.fn(async () => providersResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { fetchActiveProviders } = await import("@/components/player/providers/activeProviders");

    const [first, second] = await Promise.all([fetchActiveProviders(), fetchActiveProviders()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual([{ id: "vidy", name: "Vidy" }]);
    expect(second).toBe(first);
  });

  it("does not cache failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("nope", { status: 500 }))
      .mockResolvedValueOnce(providersResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { fetchActiveProviders } = await import("@/components/player/providers/activeProviders");

    await expect(fetchActiveProviders()).rejects.toThrow("HTTP 500");
    await expect(fetchActiveProviders()).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
