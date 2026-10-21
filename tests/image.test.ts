import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildImageUrl,
  buildSourceImageUrl,
  getPosterResponsiveUrls,
  getBackdropResponsiveUrls,
  getLogoUrl,
  getHeroBackdropUrl,
  getProfileUrl,
  getStillThumbUrl,
  getSeasonPosterThumbUrl,
} from "@/lib/tmdb/image";
import { getTmdbImageBaseUrl, getImageProxyUrl } from "@/lib/env/public";

describe("TMDB & Asset Proxy Image URL resolution", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("constructs clean asset proxy URLs when proxy is enabled", () => {
    process.env.NEXT_PUBLIC_IMAGE_MODE = "worker";
    process.env.NEXT_PUBLIC_IMAGE_PROXY_URL = "https://assets.cineby.group";

    const url = buildImageUrl("/abc123xyz.jpg", "w500");
    expect(url).toBe("https://assets.cineby.group/p/w500/abc123xyz.jpg");

    const responsivePoster = getPosterResponsiveUrls("abc123xyz.jpg");
    expect(responsivePoster.mobile).toBe("https://assets.cineby.group/p/w342/abc123xyz.jpg");
    expect(responsivePoster.desktop).toBe("https://assets.cineby.group/p/w780/abc123xyz.jpg");

    const responsiveBackdrop = getBackdropResponsiveUrls("abc123xyz.jpg");
    expect(responsiveBackdrop.mobile).toBe("https://assets.cineby.group/p/w780/abc123xyz.jpg");
    expect(responsiveBackdrop.tablet).toBe("https://assets.cineby.group/p/w1280/abc123xyz.jpg");
    expect(responsiveBackdrop.desktop).toBe("https://assets.cineby.group/p/original/abc123xyz.jpg?w=1920");
    expect(responsiveBackdrop.desktopSrcSet).toBe(
      "https://assets.cineby.group/p/w1280/abc123xyz.jpg 1280w, https://assets.cineby.group/p/original/abc123xyz.jpg?w=1920 1920w"
    );

    expect(getLogoUrl("abc123xyz.png")).toBe("https://assets.cineby.group/p/w500/abc123xyz.png");
    expect(getHeroBackdropUrl("abc123xyz.jpg")).toBe("https://assets.cineby.group/p/w1280/abc123xyz.jpg");
    expect(getProfileUrl("abc123xyz.jpg")).toBe("https://assets.cineby.group/p/w185/abc123xyz.jpg");
    expect(getSeasonPosterThumbUrl("abc123xyz.jpg")).toBe("https://assets.cineby.group/p/w154/abc123xyz.jpg");
  });

  it("builds still thumbnails as clean /p/ paths with a 640px width", () => {
    process.env.NEXT_PUBLIC_IMAGE_MODE = "worker";
    process.env.NEXT_PUBLIC_IMAGE_PROXY_URL = "https://assets.cineby.group";

    expect(getStillThumbUrl("/abc123xyz.jpg")).toBe(
      "https://assets.cineby.group/p/original/abc123xyz.jpg?w=640"
    );
  });

  it("keeps the source extension for PNG and SVG logos and never doubles it", () => {
    process.env.NEXT_PUBLIC_IMAGE_MODE = "worker";
    process.env.NEXT_PUBLIC_IMAGE_PROXY_URL = "https://assets.cineby.group";

    expect(getLogoUrl("/aB5jf4O14dykrksrPgtOlvVk0pi.svg")).toBe(
      "https://assets.cineby.group/p/original/aB5jf4O14dykrksrPgtOlvVk0pi.svg"
    );
    expect(getLogoUrl("/logo.png")).toBe("https://assets.cineby.group/p/w500/logo.png");
  });

  it("points SEO images at the original TMDB file, never the proxy", () => {
    process.env.NEXT_PUBLIC_IMAGE_MODE = "worker";

    expect(buildSourceImageUrl("/abc123xyz.jpg", "w1280")).toBe(
      "https://image.tmdb.org/t/p/w1280/abc123xyz.jpg"
    );
  });

  it("serves direct TMDB image CDN URLs in tmdb mode", () => {
    process.env.NEXT_PUBLIC_IMAGE_MODE = "tmdb";
    process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

    const url = buildImageUrl("/abc123xyz.jpg", "w500");
    expect(url).toBe("https://image.tmdb.org/t/p/w500/abc123xyz.jpg");

    const still = getStillThumbUrl("/abc123xyz.jpg");
    expect(still).toBe("https://image.tmdb.org/t/p/w300/abc123xyz.jpg");
  });

  it("builds browser-direct wsrv.nl URLs in wsrv mode", () => {
    process.env.NEXT_PUBLIC_IMAGE_MODE = "wsrv";
    process.env.NEXT_PUBLIC_IMAGE_PROXY_URL = "https://wsrv.nl";

    const poster = new URL(buildImageUrl("/abc123xyz.jpg", "w342") as string);
    expect(poster.origin).toBe("https://wsrv.nl");
    expect(poster.searchParams.get("url")).toBe("https://image.tmdb.org/t/p/w342/abc123xyz.jpg");
    expect(poster.searchParams.get("output")).toBe("webp");
    expect(poster.searchParams.get("w")).toBeNull();

    const still = new URL(getStillThumbUrl("/abc123xyz.jpg") as string);
    expect(still.searchParams.get("url")).toBe("https://image.tmdb.org/t/p/original/abc123xyz.jpg");
    expect(still.searchParams.get("w")).toBe("640");
  });

  it("leaves vector logos untouched in wsrv mode", () => {
    process.env.NEXT_PUBLIC_IMAGE_MODE = "wsrv";

    expect(buildImageUrl("/logo.svg", "w500")).toBe("https://image.tmdb.org/t/p/original/logo.svg");
  });

  it("handles null and undefined paths safely", () => {
    expect(buildImageUrl(null, "w500")).toBeNull();
    expect(buildImageUrl(undefined, "w500")).toBeNull();
    expect(getStillThumbUrl(null)).toBeNull();
    expect(getPosterResponsiveUrls(null)).toEqual({ mobile: null, desktop: null });
  });

  it("fails fast instead of guessing when image configuration is missing", () => {
    delete process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL;
    expect(() => getTmdbImageBaseUrl()).toThrow(/NEXT_PUBLIC_TMDB_IMAGE_BASE_URL/);

    delete process.env.NEXT_PUBLIC_IMAGE_PROXY_URL;
    expect(() => getImageProxyUrl()).toThrow(/NEXT_PUBLIC_IMAGE_PROXY_URL/);
  });
});
