import { describe, expect, it } from "vitest";

import { isPlayerPath } from "@/lib/ads/placement";

describe("isPlayerPath", () => {
  it("detects watch pages", () => {
    expect(isPlayerPath("/watch/movie/1")).toBe(true);
    expect(isPlayerPath("/watch")).toBe(true);
  });
  it("detects sports match pages but not the hub", () => {
    expect(isPlayerPath("/sports/football/abc")).toBe(true);
    expect(isPlayerPath("/sports")).toBe(false);
  });
  it("detects play=true on any page", () => {
    expect(isPlayerPath("/movie/1?play=true")).toBe(true);
    expect(isPlayerPath("/movie/1?play=true#x")).toBe(true);
    expect(isPlayerPath("/movie/1")).toBe(false);
  });
});
