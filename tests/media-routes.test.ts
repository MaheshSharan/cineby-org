import { describe, expect, it, vi } from "vitest";

import { encryptMediaToken, decryptMediaToken } from "@/lib/seo/obfuscate";
import { getMediaHref, getPlayHref, getEpisodeHref } from "@/lib/utils/media";
import { TAKEDOWN_REDIRECT } from "@/lib/takedowns";
import MoviePage, { getServerSideProps as getMovieServerSideProps } from "@/pages/movie/[...params]";
import TvPage, { getServerSideProps as getTvServerSideProps } from "@/pages/tv/[...params]";

vi.mock("@/lib/tmdb/server", () => ({
  getMovieDetails: vi.fn(async (id: number) => ({
    id,
    title: "The Matrix",
    mediaType: "movie",
    imdbId: null,
  })),
  getTvDetails: vi.fn(async (id: number) => ({
    id,
    title: "Game of Thrones",
    mediaType: "tv",
    seasons: [{ seasonNumber: 1, episodeCount: 10 }],
    imdbId: null,
  })),
  getSeasonEpisodes: vi.fn(async () => null),
  isTmdbNotFoundError: vi.fn(() => false),
}));

vi.mock("@/lib/services/trailer.server", () => ({
  fetchTrailerUrlServer: vi.fn(async () => null),
}));

vi.mock("@/lib/auth/getCurrentUser", () => ({
  getCurrentUser: vi.fn(async () => null),
}));

vi.mock("@/lib/db/history", () => ({
  listHistory: vi.fn(async () => []),
}));

describe("lib/utils/media.ts obfuscated URLs", () => {
  it("getMediaHref generates 32-char obfuscated movie URL", () => {
    const href = getMediaHref("movie", 603, "The Matrix");
    const match = href.match(/^\/movie\/([0-9a-f]{32})-the-matrix$/);
    expect(match).not.toBeNull();
    const token = match![1];
    expect(token).toHaveLength(32);
    expect(decryptMediaToken(token)).toEqual({ id: 603, mediaType: "movie" });
  });

  it("getMediaHref generates 32-char obfuscated tv URL", () => {
    const href = getMediaHref("tv", 1399, "Game of Thrones");
    const match = href.match(/^\/tv\/([0-9a-f]{32})-game-of-thrones$/);
    expect(match).not.toBeNull();
    const token = match![1];
    expect(token).toHaveLength(32);
    expect(decryptMediaToken(token)).toEqual({ id: 1399, mediaType: "tv" });
  });

  it("getMediaHref handles empty title without trailing dash", () => {
    const href = getMediaHref("movie", 603, "");
    const match = href.match(/^\/movie\/([0-9a-f]{32})$/);
    expect(match).not.toBeNull();
  });

  it("getPlayHref generates clean URL without play parameter", () => {
    const hrefWithoutTime = getPlayHref("movie", 603, null, "The Matrix");
    expect(hrefWithoutTime).not.toContain("play=true");
    expect(hrefWithoutTime).toMatch(/^\/movie\/[0-9a-f]{32}-the-matrix$/);

    const hrefWithTime = getPlayHref("movie", 603, 125.8, "The Matrix");
    expect(hrefWithTime).toMatch(/^\/movie\/[0-9a-f]{32}-the-matrix\?t=125$/);
  });

  it("getEpisodeHref generates 32-char obfuscated TV episode clean URL", () => {
    const href = getEpisodeHref(1399, 2, 5, 80, "Game of Thrones");
    const match = href.match(/^\/tv\/([0-9a-f]{32})-game-of-thrones\/2\/5\?t=80$/);
    expect(match).not.toBeNull();
    const token = match![1];
    expect(decryptMediaToken(token)).toEqual({ id: 1399, mediaType: "tv" });
  });
});

describe("pages/movie/[...params].tsx", () => {
  it("immediately returns 404 for numeric legacy IDs to prevent automated DMCA probes", async () => {
    const context = {
      params: { params: ["603"] },
      query: {},
      resolvedUrl: "/movie/603",
      res: { setHeader: vi.fn() },
    } as any;

    const result = await getMovieServerSideProps(context);
    expect(result).toEqual({ notFound: true });
  });

  it("returns 404 for numeric legacy IDs with slug", async () => {
    const context = {
      params: { params: ["603-the-matrix"] },
      query: { play: "true" },
      resolvedUrl: "/movie/603-the-matrix?play=true",
      res: { setHeader: vi.fn() },
    } as any;

    const result = await getMovieServerSideProps(context);
    expect(result).toEqual({ notFound: true });
  });

  it("returns 404 for legacy numeric ID and redirects token URL on takedowns", async () => {
    // 791523 is in TAKEDOWN_LIST
    const legacyContext = {
      params: { params: ["791523"] },
      query: {},
      resolvedUrl: "/movie/791523",
      res: { setHeader: vi.fn() },
    } as any;
    expect(await getMovieServerSideProps(legacyContext)).toEqual({ notFound: true });

    const token = encryptMediaToken(791523, "movie");
    const tokenContext = {
      params: { params: [`${token}-wildwood`] },
      query: {},
      resolvedUrl: `/movie/${token}-wildwood`,
      res: { setHeader: vi.fn() },
    } as any;
    expect(await getMovieServerSideProps(tokenContext)).toEqual({ redirect: TAKEDOWN_REDIRECT });
  });

  it("decrypts 32-char token and loads movie details", async () => {
    const token = encryptMediaToken(603, "movie");
    const context = {
      params: { params: [`${token}-the-matrix`] },
      query: {},
      resolvedUrl: `/movie/${token}-the-matrix`,
      res: { setHeader: vi.fn() },
    } as any;

    const result = await getMovieServerSideProps(context);
    expect("props" in result).toBe(true);
    if ("props" in result) {
      const props = await result.props;
      expect(props.details.id).toBe(603);
      expect(props.isPlaying).toBe(false);
    }
  });

  it("normalizes uppercase 32-char hex token to lowercase canonical URL", async () => {
    const rawToken = encryptMediaToken(603, "movie");
    const upperToken = rawToken.toUpperCase();
    const context = {
      params: { params: [`${upperToken}-the-matrix`] },
      query: {},
      resolvedUrl: `/movie/${upperToken}-the-matrix`,
      res: { setHeader: vi.fn() },
    } as any;

    const result = await getMovieServerSideProps(context);
    expect(result).toEqual({
      redirect: {
        destination: `/movie/${rawToken}-the-matrix`,
        permanent: true,
      },
    });
  });

  it("redirects slug-less token URL to canonical slug URL", async () => {
    const token = encryptMediaToken(603, "movie");
    const context = {
      params: { params: [token] },
      query: {},
      resolvedUrl: `/movie/${token}`,
      res: { setHeader: vi.fn() },
    } as any;

    const result = await getMovieServerSideProps(context);
    expect(result).toEqual({
      redirect: {
        destination: `/movie/${token}-the-matrix`,
        permanent: true,
      },
    });
  });

  it("returns 404 for invalid or corrupted token", async () => {
    const context = {
      params: { params: ["00000000000000000000000000000000-slug"] },
      query: {},
      resolvedUrl: "/movie/00000000000000000000000000000000-slug",
      res: { setHeader: vi.fn() },
    } as any;

    const result = await getMovieServerSideProps(context);
    expect(result).toEqual({ notFound: true });
  });

  it("returns 404 if a TV token is requested on the movie route", async () => {
    const tvToken = encryptMediaToken(1399, "tv");
    const context = {
      params: { params: [`${tvToken}-show`] },
      query: {},
      resolvedUrl: `/movie/${tvToken}-show`,
      res: { setHeader: vi.fn() },
    } as any;

    const result = await getMovieServerSideProps(context);
    expect(result).toEqual({ notFound: true });
  });

  it("renders PageSeo with canonical path pointing to obfuscated URL and without hideFromSearch", () => {
    const details = {
      id: 603,
      title: "The Matrix",
      mediaType: "movie" as const,
      overview: "Matrix description",
      releaseDate: "1999-03-30",
    } as any;

    const rendered = MoviePage({ details, isPlaying: false });
    const pageSeo = (rendered.props.children as any[])[0];
    expect(pageSeo.props.hideFromSearch).toBeUndefined();
    expect(pageSeo.props.path).toMatch(/^\/movie\/[0-9a-f]{32}-the-matrix$/);
  });
});

describe("pages/tv/[...params].tsx", () => {
  it("immediately returns 404 for numeric legacy IDs", async () => {
    const context = {
      params: { params: ["1399-game-of-thrones", "1", "2"] },
      query: {},
      resolvedUrl: "/tv/1399-game-of-thrones/1/2",
      res: { setHeader: vi.fn() },
    } as any;

    const result = await getTvServerSideProps(context);
    expect(result).toEqual({ notFound: true });
  });

  it("returns 404 for legacy numeric ID and redirects token URL on takedowns", async () => {
    // 1396 is in TAKEDOWN_LIST
    const legacyContext = {
      params: { params: ["1396"] },
      query: {},
      resolvedUrl: "/tv/1396",
      res: { setHeader: vi.fn() },
    } as any;
    expect(await getTvServerSideProps(legacyContext)).toEqual({ notFound: true });

    const token = encryptMediaToken(1396, "tv");
    const tokenContext = {
      params: { params: [`${token}-breaking-bad`] },
      query: {},
      resolvedUrl: `/tv/${token}-breaking-bad`,
      res: { setHeader: vi.fn() },
    } as any;
    expect(await getTvServerSideProps(tokenContext)).toEqual({ redirect: TAKEDOWN_REDIRECT });
  });

  it("decrypts 32-char token and loads TV details with season/episode", async () => {
    const token = encryptMediaToken(1399, "tv");
    const context = {
      params: { params: [`${token}-game-of-thrones`, "1", "2"] },
      query: {},
      resolvedUrl: `/tv/${token}-game-of-thrones/1/2`,
      res: { setHeader: vi.fn() },
    } as any;

    const result = await getTvServerSideProps(context);
    expect("props" in result).toBe(true);
    if ("props" in result) {
      const props = await result.props;
      expect(props.details.id).toBe(1399);
      expect(props.seasonNumber).toBe(1);
      expect(props.episodeNumber).toBe(2);
      expect(props.isPlaying).toBe(false);
    }
  });

  it("returns 404 if a Movie token is requested on the tv route", async () => {
    const movieToken = encryptMediaToken(603, "movie");
    const context = {
      params: { params: [`${movieToken}-movie`] },
      query: {},
      resolvedUrl: `/tv/${movieToken}-movie`,
      res: { setHeader: vi.fn() },
    } as any;

    const result = await getTvServerSideProps(context);
    expect(result).toEqual({ notFound: true });
  });

  it("returns 404 for invalid token on TV route", async () => {
    const context = {
      params: { params: ["badtoken123"] },
      query: {},
      resolvedUrl: "/tv/badtoken123",
      res: { setHeader: vi.fn() },
    } as any;

    const result = await getTvServerSideProps(context);
    expect(result).toEqual({ notFound: true });
  });

  it("renders PageSeo with canonical path pointing to obfuscated URL and without hideFromSearch", () => {
    const details = {
      id: 1399,
      title: "Game of Thrones",
      mediaType: "tv" as const,
      overview: "GOT description",
      releaseDate: "2011-04-17",
    } as any;

    const rendered = TvPage({ details, isPlaying: false });
    const pageSeo = (rendered.props.children as any[])[0];
    expect(pageSeo.props.hideFromSearch).toBeUndefined();
    expect(pageSeo.props.path).toMatch(/^\/tv\/[0-9a-f]{32}-game-of-thrones$/);
  });
});
