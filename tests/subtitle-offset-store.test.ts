import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadOffset, offsetKey, sanitizeOffset, saveOffset } from "@/lib/subtitles/sync/offsetStore";

describe("subtitle offset store", () => {
  let data: Record<string, string>;

  beforeEach(() => {
    data = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data[key] ?? null,
      setItem: (key: string, value: string) => {
        data[key] = value;
      },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("caps offsets and rejects junk", () => {
    expect(sanitizeOffset(999)).toBe(60);
    expect(sanitizeOffset(-999)).toBe(-60);
    expect(sanitizeOffset(1.23456)).toBe(1.235);
    expect(sanitizeOffset("5")).toBe(0);
    expect(sanitizeOffset(Number.NaN)).toBe(0);
  });

  it("round-trips per track and removes zero entries", () => {
    const key = offsetKey("movie-1-0-0", "srv", "en");
    saveOffset(key, 1.34);
    expect(loadOffset(key)).toBe(1.34);
    expect(loadOffset(offsetKey("movie-1-0-0", "srv", "fr"))).toBe(0);
    saveOffset(key, 0);
    expect(JSON.parse(data.cineby_subtitle_offsets)).toEqual({});
  });

  it("sanitizes tampered stored values and survives corrupt JSON", () => {
    data.cineby_subtitle_offsets = JSON.stringify({ a: 1e9, b: "x" });
    expect(loadOffset("a")).toBe(60);
    expect(loadOffset("b")).toBe(0);
    data.cineby_subtitle_offsets = "{not json";
    expect(loadOffset("a")).toBe(0);
  });
});
