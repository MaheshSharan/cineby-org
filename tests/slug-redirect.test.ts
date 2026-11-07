import { describe, expect, it } from "vitest";

import { getCanonicalSlugRedirect } from "@/lib/utils/slug";

describe("getCanonicalSlugRedirect", () => {
  it("does not redirect when the URL is already canonical", () => {
    expect(getCanonicalSlugRedirect("/movie/603-the-matrix", "/movie/603-the-matrix", "/movie/603-the-matrix")).toBeNull();
  });

  it("permanently redirects a slug-less URL to the canonical slug URL", () => {
    expect(getCanonicalSlugRedirect("/movie/603", "/movie/603-the-matrix", "/movie/603")).toEqual({
      destination: "/movie/603-the-matrix",
      permanent: true,
    });
  });

  it("redirects a wrong slug and keeps the query string", () => {
    expect(
      getCanonicalSlugRedirect("/movie/603-wrong", "/movie/603-the-matrix", "/movie/603-wrong?play=true&t=90")
    ).toEqual({ destination: "/movie/603-the-matrix?play=true&t=90", permanent: true });
  });

  it("keeps season and episode segments of a TV URL", () => {
    expect(
      getCanonicalSlugRedirect("/tv/1399/1/2", "/tv/1399-game-of-thrones/1/2", "/tv/1399/1/2?play=true")
    ).toEqual({ destination: "/tv/1399-game-of-thrones/1/2?play=true", permanent: true });
  });
});
