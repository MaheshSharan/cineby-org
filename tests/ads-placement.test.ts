import { describe, expect, it } from "vitest";

import { isAdFreePath, isPlayerPath } from "@/lib/ads/placement";

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
    expect(isPlayerPath("/blog?play=true")).toBe(true);
    expect(isPlayerPath("/blog?play=true#x")).toBe(true);
    expect(isPlayerPath("/blog")).toBe(false);
  });
});

describe("isAdFreePath", () => {
  it("covers player pages and title pages, where the player opens in place", () => {
    expect(isAdFreePath("/sports/football/abc")).toBe(true);
    expect(isAdFreePath("/movie/cc71f49521ec7cb4753f3c23de9ccb2d-ebenezer")).toBe(true);
    expect(isAdFreePath("/tv/c4a0452c661148a9f4e9702d590d80eb-the-body/1/1?t=5")).toBe(true);
  });
  it("leaves listing and content pages open to ads", () => {
    expect(isAdFreePath("/")).toBe(false);
    expect(isAdFreePath("/browse/movie")).toBe(false);
    expect(isAdFreePath("/blog/some-post")).toBe(false);
    expect(isAdFreePath("/sports")).toBe(false);
  });
});
