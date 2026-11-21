import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getActiveEndpoints } from "@/lib/sports/sportsService";
import type { FlattenedSportsData } from "@/lib/sports/types";

const emptyPayload: FlattenedSportsData = { all: [], liveNow: [], upcoming: [], categories: [] };

function requestedUrls(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

describe("fetchSportsClientSide", () => {
  beforeEach(() => {
    // The module keeps an in-memory cache, so each test gets a fresh copy.
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asks the first mirror directly and never touches our own endpoint when it answers", async () => {
    const match = {
      id: 1,
      name: "Arsenal vs Chelsea",
      tag: "Premier League",
      category_name: "Football",
      uri_name: "football/premier-league/ars-che",
      starts_at: 1000,
      ends_at: 2000,
      always_live: 0,
      iframe: "https://example.test/embed",
      viewers: "10",
    };
    // Mirrors answer with raw category groups, not the flattened shape our own endpoint returns.
    const mirrorPayload = { streams: [{ category: "Football", streams: [match] }] };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(mirrorPayload), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { fetchSportsClientSide } = await import("@/hooks/useSportsData");
    const result = await fetchSportsClientSide();

    expect(result?.all).toHaveLength(1);
    expect(requestedUrls(fetchMock)).toEqual([getActiveEndpoints()[0]]);
  });

  it("tries every mirror in order, then falls back to our own endpoint", async () => {
    const fetchMock = vi.fn(async () => new Response("bad gateway", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);

    const { fetchSportsClientSide } = await import("@/hooks/useSportsData");
    const result = await fetchSportsClientSide();

    expect(result).toBeNull();
    expect(requestedUrls(fetchMock)).toEqual([...getActiveEndpoints(), "/api/sports"]);
  });
});
