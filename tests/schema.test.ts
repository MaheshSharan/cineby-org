import { describe, it, expect } from "vitest";
import {
  buildBreadcrumbJsonLd,
  buildMovieJsonLd,
  buildTvSeriesJsonLd,
  buildWebSiteJsonLd,
  sanitizeJsonLd,
} from "@/lib/seo/jsonLd";
import type { MovieDetails, TvDetails } from "@/lib/tmdb";
import { SITE_URL } from "@/lib/seo/site";

describe("Schema.org JSON-LD structured data generators", () => {
  it("generates WebSite schema with SearchAction for Sitelinks Searchbox", () => {
    const schema = buildWebSiteJsonLd();

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("WebSite");
    expect(schema.url).toBe(SITE_URL);
    expect(schema.potentialAction).toBeDefined();

    const action = schema.potentialAction as Record<string, unknown>;
    expect(action["@type"]).toBe("SearchAction");
    expect((action.target as Record<string, unknown>).urlTemplate).toBe(
      `${SITE_URL}/browse/movie?q={search_term_string}`
    );
  });

  it("generates BreadcrumbList schema with 3-tier hierarchy", () => {
    const schema = buildBreadcrumbJsonLd("movie", "Inception", 27205);

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("BreadcrumbList");

    const items = schema.itemListElement as Array<{ position: number; name: string; item: string }>;
    expect(items.length).toBe(3);
    expect(items[0]).toEqual({ "@type": "ListItem", position: 1, name: "Home", item: SITE_URL });
    expect(items[1]).toEqual({
      "@type": "ListItem",
      position: 2,
      name: "Movies",
      item: `${SITE_URL}/browse/movie`,
    });
    expect(items[2]).toEqual({
      "@type": "ListItem",
      position: 3,
      name: "Inception",
      item: `${SITE_URL}/movie/27205-inception`,
    });
  });

  it("generates Movie schema with compliant WatchAction EntryPoint and accessibility requirements", () => {
    const movie: MovieDetails = {
      id: 603,
      title: "The Matrix",
      originalTitle: "The Matrix",
      overview: "Set in the 22nd century...",
      tagline: "Welcome to the Real World.",
      posterPath: "/matrix.jpg",
      backdropPath: "/matrix_bg.jpg",
      logoPath: null,
      releaseDate: "1999-03-30",
      voteAverage: 8.2,
      voteCount: 24000,
      genreIds: [28, 878],
      runtime: 136,
      genres: [{ id: 28, name: "Action" }, { id: 878, name: "Science Fiction" }],
      productionCompanies: [],
      cast: [{ id: 6384, name: "Keanu Reeves", character: "Neo", profilePath: null, order: 0 }],
      crew: [{ id: 9339, name: "Lilly Wachowski", job: "Director", profilePath: null }],
      videos: [],
      recommendations: [],
      similar: [],
      certification: "R",
      imdbId: "tt0133093",
      status: "Released",
      budget: 63000000,
      revenue: 463517383,
      mediaType: "movie",
      originalLanguage: "en",
      popularity: 120.5,
    };

    const schema = buildMovieJsonLd(movie);

    expect(schema["@type"]).toBe("Movie");
    expect(schema.name).toBe("The Matrix");
    expect(schema.inLanguage).toBe("en");

    const action = schema.potentialAction as Record<string, unknown>;
    expect(action["@type"]).toBe("WatchAction");
    expect((action.target as Record<string, unknown>).urlTemplate).toBe(
      `${SITE_URL}/movie/603-the-matrix?play=true`
    );
    expect((action.actionAccessibilityRequirement as Record<string, unknown>).category).toBe("free");
  });

  it("generates TVSeries schema with containsSeason hierarchy nodes", () => {
    const tv: TvDetails = {
      id: 1399,
      title: "Game of Thrones",
      originalName: "Game of Thrones",
      overview: "Seven noble families fight for control...",
      tagline: "Winter Is Coming",
      posterPath: "/got.jpg",
      backdropPath: "/got_bg.jpg",
      logoPath: null,
      releaseDate: "2011-04-17",
      voteAverage: 8.4,
      voteCount: 22000,
      genreIds: [18, 10765],
      status: "Ended",
      numberOfSeasons: 8,
      numberOfEpisodes: 73,
      episodeRunTime: [60],
      genres: [{ id: 18, name: "Drama" }, { id: 10765, name: "Sci-Fi & Fantasy" }],
      networks: [],
      seasons: [
        { id: 3624, name: "Season 1", overview: "", posterPath: null, seasonNumber: 1, episodeCount: 10, airDate: "2011-04-17" },
        { id: 3625, name: "Season 2", overview: "", posterPath: null, seasonNumber: 2, episodeCount: 10, airDate: "2012-04-01" },
      ],
      createdBy: [],
      cast: [{ id: 1229, name: "Emilia Clarke", character: "Daenerys Targaryen", profilePath: null, order: 0 }],
      crew: [],
      videos: [],
      recommendations: [],
      similar: [],
      certification: "TV-MA",
      imdbId: "tt0944947",
      mediaType: "tv",
      originalLanguage: "en",
      popularity: 350.2,
    };

    const schema = buildTvSeriesJsonLd(tv);

    expect(schema["@type"]).toBe("TVSeries");
    expect(schema.numberOfSeasons).toBe(8);
    expect(schema.containsSeason).toBeDefined();

    const seasons = schema.containsSeason as Array<{ seasonNumber: number; numberOfEpisodes: number }>;
    expect(seasons.length).toBe(2);
    expect(seasons[0].seasonNumber).toBe(1);
    expect(seasons[0].numberOfEpisodes).toBe(10);
  });

  it("sanitizes closing tags to prevent XSS injection in JSON-LD scripts", () => {
    const malicious = { name: "</script><script>alert('xss')</script>" };
    const sanitized = sanitizeJsonLd(malicious);

    expect(sanitized).not.toContain("</script>");
    expect(sanitized).toContain("\\u003c/script>");
  });
});
