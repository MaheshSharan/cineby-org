import { describe, expect, it } from "vitest";
import {
  browserTtlMs,
  CACHE_PROFILES,
  cacheControl,
  edgeTtl,
  NO_STORE_CACHE_CONTROL,
  PRIVATE_CACHE_CONTROL,
  refreshAfter,
  storeTtl,
  type CacheProfileName,
} from "@/lib/cache/profiles";
import { isCacheableResponse } from "@/lib/cache/edgeResponseCache";

const profileNames = Object.keys(CACHE_PROFILES) as CacheProfileName[];

describe("cache profiles", () => {
  it("builds Cache-Control headers from the profile table", () => {
    expect(cacheControl("page")).toBe("public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400");
    expect(cacheControl("home")).toBe("public, max-age=43200, s-maxage=86400, stale-while-revalidate=86400");
    expect(cacheControl("trending")).toBe("public, max-age=3600, s-maxage=172800, stale-while-revalidate=172800");
    expect(cacheControl("sportsData")).toBe("public, max-age=300, s-maxage=300, stale-while-revalidate=600");
  });

  it("leaves out directives a profile does not use", () => {
    expect(cacheControl("playerConfig")).toBe("public, max-age=60, s-maxage=60");
    expect(cacheControl("flag")).toBe("public, max-age=604800, s-maxage=604800, immutable");
    expect(cacheControl("flagMiss")).toBe("public, max-age=300");
  });

  it("lets a browser keep a response no longer than shared caches do", () => {
    for (const name of profileNames) {
      const { browser, edge } = CACHE_PROFILES[name];
      if (edge > 0) expect(browser, name).toBeLessThanOrEqual(edge);
    }
  });

  it("refreshes stored data in the background before it expires", () => {
    for (const name of profileNames) {
      const after = refreshAfter(name);
      if (after !== undefined) expect(after, name).toBeLessThan(storeTtl(name));
    }
  });

  it("keeps data in the Worker for as long as shared caches keep the response, unless a profile says otherwise", () => {
    expect(storeTtl("movieDetails")).toBe(edgeTtl("movieDetails"));
    expect(storeTtl("trailer")).toBe(7 * 24 * 60 * 60);
    expect(storeTtl("trailerMiss")).toBe(5 * 60);
  });

  it("derives the client-side data cache time from the browser time", () => {
    expect(browserTtlMs("sportsData")).toBe(5 * 60 * 1000);
    expect(browserTtlMs("search")).toBe(10 * 60 * 1000);
  });

  it("serves the sports list for 5 minutes while a match's live status is computed in the browser", () => {
    expect(edgeTtl("sportsData")).toBe(5 * 60);
    expect(storeTtl("sportsData")).toBeGreaterThan(edgeTtl("sportsData"));
  });

  it("produces headers the Worker's edge cache stores, and never stores private or no-store ones", () => {
    const stored = new Response("x", { headers: { "cache-control": cacheControl("page") } });
    const privatePage = new Response("x", { headers: { "cache-control": PRIVATE_CACHE_CONTROL } });
    const noStore = new Response("x", { headers: { "cache-control": NO_STORE_CACHE_CONTROL } });
    const browserOnly = new Response("x", { headers: { "cache-control": cacheControl("flagMiss") } });

    expect(isCacheableResponse(stored)).toBe(true);
    expect(isCacheableResponse(privatePage)).toBe(false);
    expect(isCacheableResponse(noStore)).toBe(false);
    expect(isCacheableResponse(browserOnly)).toBe(false);
  });
});
