import { describe, it, expect } from "vitest";

import {
  buildCanonicalCacheUrl,
  normalizeOutput,
  normalizeQuality,
  normalizeWidth,
  parseImageRequest,
} from "@/workers/assets/params";

const ORIGIN = "https://assets.cineby.group";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500/abc123.jpg";

// Quality values the app requests today (lib/tmdb/image.ts); clamping must leave them unchanged.
const APP_QUALITIES = [50, 60, 65, 75, 80, 85];

function parse(pathAndQuery: string) {
  return parseImageRequest(new URL(pathAndQuery, ORIGIN));
}

function cacheKeyFor(pathAndQuery: string): string {
  const result = parse(pathAndQuery);

  if (!result.ok) {
    throw new Error(result.message);
  }

  return buildCanonicalCacheUrl(ORIGIN, result.params);
}

describe("assets worker output", () => {
  it("defaults to webp and accepts only webp or avif", () => {
    expect(normalizeOutput(null)).toBe("webp");
    expect(normalizeOutput("webp")).toBe("webp");
    expect(normalizeOutput("avif")).toBe("avif");
    expect(normalizeOutput("png")).toBeNull();
    expect(normalizeOutput("jpeg")).toBeNull();
    expect(normalizeOutput("")).toBeNull();
  });
});

describe("assets worker quality", () => {
  it("falls back to the default when missing or not a number", () => {
    expect(normalizeQuality(null)).toBe(80);
    expect(normalizeQuality("abc")).toBe(80);
  });

  it("clamps to 30-90", () => {
    expect(normalizeQuality("1")).toBe(30);
    expect(normalizeQuality("-5")).toBe(30);
    expect(normalizeQuality("100")).toBe(90);
    expect(normalizeQuality("99999")).toBe(90);
  });

  it("rounds to steps of 5 so near-identical values share one cache entry", () => {
    expect(normalizeQuality("77")).toBe(75);
    expect(normalizeQuality("78")).toBe(80);
  });

  it("keeps every quality the app uses unchanged", () => {
    for (const quality of APP_QUALITIES) {
      expect(normalizeQuality(String(quality))).toBe(quality);
    }
  });
});

describe("assets worker width", () => {
  it("ignores missing or invalid widths", () => {
    expect(normalizeWidth(null)).toBeNull();
    expect(normalizeWidth("0")).toBeNull();
    expect(normalizeWidth("-10")).toBeNull();
    expect(normalizeWidth("abc")).toBeNull();
  });

  it("rounds up to a fixed bucket and caps at 1920", () => {
    expect(normalizeWidth("1")).toBe(92);
    expect(normalizeWidth("641")).toBe(780);
    expect(normalizeWidth("99999")).toBe(1920);
  });

  it("keeps the 640px still thumbnail width unchanged", () => {
    expect(normalizeWidth("640")).toBe(640);
  });
});

describe("assets worker request parsing", () => {
  it("rejects hosts that are not allowlisted", () => {
    const result = parse(`/?url=${encodeURIComponent("https://example.com/a.jpg")}`);

    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it("rejects unsupported output formats", () => {
    const result = parse(`/?url=${encodeURIComponent(TMDB_IMAGE)}&output=png`);

    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects requests without a target", () => {
    expect(parse("/")).toMatchObject({ ok: false, status: 400 });
    expect(parse("/?url=")).toMatchObject({ ok: false, status: 400 });
    expect(parse("/?url=not-a-url")).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects /p/ paths with an unknown size or a file name that could escape the path", () => {
    expect(parse("/p/w123/abc123.webp")).toMatchObject({ ok: false, status: 400 });
    expect(parse("/p/w500/..%2F..%2Fsecret.webp")).toMatchObject({ ok: false, status: 400 });
    expect(parse("/p/w500/a/b.webp")).toMatchObject({ ok: false, status: 400 });
  });

  it("resolves a valid /p/ path to the TMDB image", () => {
    const result = parse("/p/w500/abc123.webp");

    expect(result).toMatchObject({ ok: true, params: { targetUrl: TMDB_IMAGE } });
  });
});

describe("assets worker cache key", () => {
  it("is identical for requests that normalize to the same image", () => {
    const encoded = encodeURIComponent(TMDB_IMAGE);

    const original = cacheKeyFor(`/?url=${encoded}&w=640&output=webp&q=75&n=-1`);
    const nearbyValues = cacheKeyFor(`/?url=${encoded}&w=630&output=webp&q=76`);
    const withJunk = cacheKeyFor(`/?cachebust=123&url=${encoded}&w=620&q=74&n=-1&utm=x`);

    expect(nearbyValues).toBe(original);
    expect(withJunk).toBe(original);
  });

  it("keeps different qualities, widths and formats apart", () => {
    const encoded = encodeURIComponent(TMDB_IMAGE);
    const base = cacheKeyFor(`/?url=${encoded}&q=75`);

    expect(cacheKeyFor(`/?url=${encoded}&q=85`)).not.toBe(base);
    expect(cacheKeyFor(`/?url=${encoded}&q=75&w=500`)).not.toBe(base);
    expect(cacheKeyFor(`/?url=${encoded}&q=75&output=avif`)).not.toBe(base);
  });

  it("is shared between the /p/ path and the url parameter for the same image", () => {
    const fromPath = cacheKeyFor("/p/w500/abc123.webp");
    const fromUrlParam = cacheKeyFor(`/?url=${encodeURIComponent(TMDB_IMAGE)}`);

    expect(fromPath).toBe(fromUrlParam);
  });
});
