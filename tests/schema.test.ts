import { describe, it, expect } from "vitest";
import {
  buildBreadcrumbJsonLd,
  buildMovieJsonLd,
  buildAboutPageJsonLd,
  buildOrganizationJsonLd,
  buildSportsEventJsonLd,
  buildTvSeriesJsonLd,
  buildWebSiteJsonLd,
  sanitizeJsonLd,
} from "@/lib/seo/jsonLd";
import type { MovieDetails, TvDetails } from "@/lib/tmdb";
import { getSiteUrl } from "@/lib/env/public";

describe("Schema.org JSON-LD structured data generators", () => {
  it("generates Organization schema with stable @id and absolute 512px logo", () => {
    const schema = buildOrganizationJsonLd();

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("Organization");
    expect(schema["@id"]).toBe(`${getSiteUrl()}/#organization`);
    expect(schema.name).toBe("Cineby");
    expect(schema.url).toBe(getSiteUrl());

    const logo = schema.logo as Record<string, unknown>;
    expect(logo["@type"]).toBe("ImageObject");
    expect(logo.url).toBe(`${getSiteUrl()}/icons/icon-512.png`);
    expect(logo.width).toBe(512);
    expect(logo.height).toBe(512);

    expect(schema.sameAs).toEqual(["https://x.com/Cineby_groups"]);
  });

  it("generates AboutPage schema linked to the Organization and WebSite entities", () => {
    const schema = buildAboutPageJsonLd();

    expect(schema["@type"]).toBe("AboutPage");
    expect(schema.url).toBe(`${getSiteUrl()}/about`);
    expect(schema.about).toEqual({ "@id": `${getSiteUrl()}/#organization` });
    expect(schema.isPartOf).toEqual({ "@id": `${getSiteUrl()}/#website` });
  });

  it("generates WebSite schema with SearchAction and references Organization publisher @id", () => {
    const schema = buildWebSiteJsonLd();

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("WebSite");
    expect(schema["@id"]).toBe(`${getSiteUrl()}/#website`);
    expect(schema.url).toBe(`${getSiteUrl()}/`);
    expect(schema.alternateName).toBe(new URL(getSiteUrl()).hostname);
    expect(schema.alternateName).not.toBe(schema.name);
    expect(schema.publisher).toEqual({
      "@id": `${getSiteUrl()}/#organization`,
    });
    expect(schema.potentialAction).toBeDefined();

    const action = schema.potentialAction as Record<string, unknown>;
    expect(action["@type"]).toBe("SearchAction");
    expect((action.target as Record<string, unknown>).urlTemplate).toBe(
      `${getSiteUrl()}/browse/movie?q={search_term_string}`
    );
  });

  it("generates BreadcrumbList schema with 3-tier hierarchy", () => {
    const schema = buildBreadcrumbJsonLd("movie", "Inception", 27205);

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("BreadcrumbList");

    const items = schema.itemListElement as Array<{ position: number; name: string; item: string }>;
    expect(items.length).toBe(3);
    expect(items[0]).toEqual({ "@type": "ListItem", position: 1, name: "Home", item: getSiteUrl() });
    expect(items[1]).toEqual({
      "@type": "ListItem",
      position: 2,
      name: "Movies",
      item: `${getSiteUrl()}/browse/movie`,
    });
    expect(items[2]).toEqual({
      "@type": "ListItem",
      position: 3,
      name: "Inception",
      item: `${getSiteUrl()}/movie/27205-inception`,
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
      `${getSiteUrl()}/movie/603-the-matrix?play=true`
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

  it("generates SportsEvent schema with full Google Search Console compliant properties for scheduled matches", () => {
    const schema = buildSportsEventJsonLd({
      name: "Arsenal vs Chelsea",
      category_name: "Football",
      tag: "Premier League",
      uri_name: "football/premier-league/ars-che",
      starts_at: 1772500000,
      ends_at: 1772507200,
      poster: "https://example.com/poster.jpg",
    });

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("SportsEvent");
    expect(schema.name).toBe("Arsenal vs Chelsea");
    expect(schema.startDate).toBe(new Date(1772500000 * 1000).toISOString());
    expect(schema.endDate).toBe(new Date(1772507200 * 1000).toISOString());
    expect(schema.eventAttendanceMode).toBe("https://schema.org/OnlineEventAttendanceMode");
    expect(schema.eventStatus).toBe("https://schema.org/EventScheduled");
    expect(schema.image).toBe("https://example.com/poster.jpg");
    expect(schema.sport).toBe("Football");

    // Location
    expect(schema.location).toEqual({
      "@type": "VirtualLocation",
      url: `${getSiteUrl()}/sports/football/premier-league/ars-che`,
    });

    // Offers
    expect(schema.offers).toEqual({
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      validFrom: new Date(1772500000 * 1000).toISOString(),
      url: `${getSiteUrl()}/sports/football/premier-league/ars-che`,
    });

    // Organizer
    expect(schema.organizer).toEqual({
      "@type": "Organization",
      "@id": `${getSiteUrl()}/#organization`,
      name: "Cineby",
      url: getSiteUrl(),
    });

    // Performers extracted from "Arsenal vs Chelsea"
    expect(schema.performer).toEqual([
      { "@type": "SportsTeam", name: "Arsenal" },
      { "@type": "SportsTeam", name: "Chelsea" },
    ]);
  });

  it("generates fallback ISO start/end dates and default image for 24/7 channels without explicit starts_at", () => {
    const fixedNowMs = Date.UTC(2026, 2, 15, 14, 30, 0); // 2026-03-15T14:30:00Z
    const schema = buildSportsEventJsonLd(
      {
        name: "NFL Network 24/7",
        category_name: "American Football",
        tag: "NFL",
        uri_name: "nfl-network",
      },
      { nowMs: fixedNowMs }
    );

    expect(schema["@type"]).toBe("SportsEvent");
    expect(schema.startDate).toBe("2026-03-15T00:00:00.000Z");
    expect(schema.endDate).toBe("2026-03-15T23:59:59.999Z");
    expect(schema.image).toBe(`${getSiteUrl()}/screenshots/home-wide.png`);

    const offers = schema.offers as Record<string, unknown>;
    expect(offers.validFrom).toBe("2026-03-15T00:00:00.000Z");
    expect(offers.availability).toBe("https://schema.org/InStock");
    expect(offers.url).toBe(`${getSiteUrl()}/sports/nfl-network`);
  });

  it("calculates fallback endDate (startDate + 3 hours) when starts_at is provided without ends_at", () => {
    const startsAtSec = 1772500000;
    const schema = buildSportsEventJsonLd({
      name: "Formula 1 Grand Prix",
      category_name: "Motorsport",
      uri_name: "f1-live",
      starts_at: startsAtSec,
    });

    const expectedStart = new Date(startsAtSec * 1000).toISOString();
    const expectedEnd = new Date((startsAtSec + 3 * 3600) * 1000).toISOString();

    expect(schema.startDate).toBe(expectedStart);
    expect(schema.endDate).toBe(expectedEnd);
  });
});
