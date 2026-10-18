import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildImageUrl,
  getPosterResponsiveUrls,
  getBackdropResponsiveUrls,
  getLogoUrl,
  getHeroBackdropUrl,
  getProfileUrl,
  getStillThumbUrl,
  getSeasonPosterThumbUrl,
} from "@/lib/tmdb/image";
import { getTmdbImageBaseUrl, getImageProxyUrl } from "@/lib/env";

describe("TMDB & Asset Proxy Image URL resolution", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("constructs clean asset proxy URLs when proxy is enabled", () => {
    process.env.NEXT_PUBLIC_ENABLE_IMAGE_PROXY = "true";
    process.env.NEXT_PUBLIC_IMAGE_PROXY_URL = "https://assets.cineby.group";

    const url = buildImageUrl("/abc123xyz.jpg", "w500");
    expect(url).toBe("https://assets.cineby.group/p/w500/abc123xyz.webp");

    const responsivePoster = getPosterResponsiveUrls("abc123xyz.jpg");
    expect(responsivePoster.mobile).toBe("https://assets.cineby.group/p/w342/abc123xyz.webp");
    expect(responsivePoster.desktop).toBe("https://assets.cineby.group/p/w780/abc123xyz.webp");

    const responsiveBackdrop = getBackdropResponsiveUrls("abc123xyz.jpg");
    expect(responsiveBackdrop.mobile).toBe("https://assets.cineby.group/p/w780/abc123xyz.webp");
    expect(responsiveBackdrop.desktop).toBe("https://assets.cineby.group/p/w1280/abc123xyz.webp");

    expect(getLogoUrl("abc123xyz.png")).toBe("https://assets.cineby.group/p/w500/abc123xyz.webp");
    expect(getHeroBackdropUrl("abc123xyz.jpg")).toBe("https://assets.cineby.group/p/original/abc123xyz.webp");
    expect(getProfileUrl("abc123xyz.jpg")).toBe("https://assets.cineby.group/p/w185/abc123xyz.webp");
    expect(getSeasonPosterThumbUrl("abc123xyz.jpg")).toBe("https://assets.cineby.group/p/w154/abc123xyz.webp");
  });

  it("constructs still thumbnail with 640px proxy URL when proxy is enabled", () => {
    process.env.NEXT_PUBLIC_ENABLE_IMAGE_PROXY = "true";
    process.env.NEXT_PUBLIC_IMAGE_PROXY_URL = "https://assets.cineby.group";

    const stillUrl = getStillThumbUrl("abc123xyz.jpg");
    expect(stillUrl).toContain("https://assets.cineby.group/?url=");
    expect(stillUrl).toContain("&w=640");
    expect(stillUrl).toContain("&output=webp&q=75&n=-1");
  });

  it("falls back to direct TMDB image CDN URLs when proxy is disabled", () => {
    process.env.NEXT_PUBLIC_ENABLE_IMAGE_PROXY = "false";
    delete process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;

    const url = buildImageUrl("/abc123xyz.jpg", "w500");
    expect(url).toBe("https://image.tmdb.org/t/p/w500/abc123xyz.jpg");

    const still = getStillThumbUrl("/abc123xyz.jpg");
    expect(still).toBe("https://image.tmdb.org/t/p/w300/abc123xyz.jpg");
  });

  it("handles null and undefined paths safely", () => {
    expect(buildImageUrl(null, "w500")).toBeNull();
    expect(buildImageUrl(undefined, "w500")).toBeNull();
    expect(getStillThumbUrl(null)).toBeNull();
    expect(getPosterResponsiveUrls(null)).toEqual({ mobile: null, desktop: null });
  });

  it("never throws if NEXT_PUBLIC_TMDB_IMAGE_BASE_URL is missing in build environment", () => {
    delete process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;
    expect(() => getTmdbImageBaseUrl()).not.toThrow();
    expect(getTmdbImageBaseUrl()).toBe("https://image.tmdb.org/t/p");
  });

  it("never throws if NEXT_PUBLIC_IMAGE_PROXY_URL is missing in build environment", () => {
    delete process.env.NEXT_PUBLIC_IMAGE_PROXY_URL;
    expect(() => getImageProxyUrl()).not.toThrow();
    expect(getImageProxyUrl()).toBe("https://assets.cineby.group");
  });
});
