import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { clearSearchCache, searchMedia } from "@/lib/api/search";
import { PRIVATE_PAGE_CACHE_CONTROL, PUBLIC_PAGE_CACHE_CONTROL } from "@/lib/http/cacheControl";
import {
  isSearchableQuery,
  MAX_SEARCH_QUERY_LENGTH,
  normalizeSearchQuery,
} from "@/lib/search/query";

describe("normalizeSearchQuery", () => {
  it("maps casing and spacing variants of one title to the same query", () => {
    expect(normalizeSearchQuery("Dune")).toBe("dune");
    expect(normalizeSearchQuery("  DUNE ")).toBe("dune");
    expect(normalizeSearchQuery("The   Dark\tKnight")).toBe("the dark knight");
  });

  it("caps the query length", () => {
    expect(normalizeSearchQuery("a".repeat(500))).toHaveLength(MAX_SEARCH_QUERY_LENGTH);
  });

  it("accepts two characters and rejects shorter queries", () => {
    expect(isSearchableQuery("")).toBe(false);
    expect(isSearchableQuery("a")).toBe(false);
    expect(isSearchableQuery("up")).toBe(true);
  });
});

describe("searchMedia", () => {
  const movie = { id: 1, mediaType: "movie", title: "Dune" };

  beforeEach(() => {
    clearSearchCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockSearchResponse() {
    return vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(JSON.stringify({ results: [movie] }), { status: 200 }));
  }

  it("does not call the API for queries that are too short", async () => {
    const fetchSpy = mockSearchResponse();

    expect(await searchMedia("d")).toEqual([]);
    expect(await searchMedia("   ")).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends the normalized query", async () => {
    const fetchSpy = mockSearchResponse();

    await searchMedia("  The   DARK Knight ");

    expect(fetchSpy.mock.calls[0][0]).toBe("/api/tmdb/search?q=the%20dark%20knight");
  });

  it("answers repeated searches from memory, whatever the casing", async () => {
    const fetchSpy = mockSearchResponse();

    await searchMedia("Dune");
    const again = await searchMedia("dune ");
    await searchMedia("DUNE");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(again).toEqual([movie]);
  });

  it("does not remember failed searches", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [movie] }), { status: 200 }));

    await expect(searchMedia("dune")).rejects.toThrow("500");
    expect(await searchMedia("dune")).toEqual([movie]);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("forgets the oldest entries beyond its size limit", async () => {
    const fetchSpy = mockSearchResponse();

    for (let i = 0; i < 51; i++) {
      await searchMedia(`title ${i}`);
    }
    await searchMedia("title 0");
    await searchMedia("title 50");

    expect(fetchSpy).toHaveBeenCalledTimes(52);
  });
});

describe("GET /api/tmdb/search", () => {
  function callSearch(query: Record<string, string>) {
    return import("@/pages/api/tmdb/search").then(({ default: handler }) => {
      let statusCode = 200;
      const headers: Record<string, string> = {};
      const req = { method: "GET", query, headers: {} } as unknown as NextApiRequest;
      const res = {
        status(code: number) {
          statusCode = code;
          return res;
        },
        json() {
          return res;
        },
        setHeader(name: string, value: string) {
          headers[name.toLowerCase()] = value;
          return res;
        },
      } as unknown as NextApiResponse;

      return handler(req, res).then(() => ({ status: statusCode, headers }));
    });
  }

  it("rejects missing and too-short queries before any upstream call", async () => {
    expect((await callSearch({})).status).toBe(400);
    expect((await callSearch({ q: " a " })).status).toBe(400);
  });
});

describe("page cache control", () => {
  it("lets browsers reuse public pages and keeps user-specific pages out of shared caches", () => {
    expect(PUBLIC_PAGE_CACHE_CONTROL).toContain("max-age=300");
    expect(PUBLIC_PAGE_CACHE_CONTROL).toContain("s-maxage=3600");
    expect(PUBLIC_PAGE_CACHE_CONTROL).not.toContain("private");
    expect(PRIVATE_PAGE_CACHE_CONTROL).toContain("private");
    expect(PRIVATE_PAGE_CACHE_CONTROL).not.toContain("public");
  });
});
