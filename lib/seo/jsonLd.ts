import type { MovieDetails, TvDetails } from "@/lib/tmdb";
import { buildAbsoluteUrl, SITE_NAME } from "@/lib/seo/site";
import { getSiteUrl } from "@/lib/env/public";
import { getMediaHref } from "@/lib/utils/media";
import { getMediaOpenGraphImageUrl } from "@/lib/seo/media";

export type JsonLdData = Record<string, unknown>;

/**
 * Escapes unsafe characters for safe embedding inside a <script type="application/ld+json"> tag.
 * Complies with AGENTS.md §18 (sanitizes against XSS injection via </script> closing tags).
 */
export function sanitizeJsonLd(data: JsonLdData | JsonLdData[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Generates Schema.org BreadcrumbList for hierarchical crawl tree:
 * Home (/) > Category (/browse/{type}) > Title (/movie/{id}-{slug})
 */
export function buildBreadcrumbJsonLd(
  mediaType: "movie" | "tv",
  title: string,
  id: number
): JsonLdData {
  const categoryLabel = mediaType === "movie" ? "Movies" : "TV Shows";
  const categoryPath = mediaType === "movie" ? "/browse/movie" : "/browse/tv";
  const itemUrl = buildAbsoluteUrl(getMediaHref(mediaType, id, title));

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: getSiteUrl(),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: categoryLabel,
        item: buildAbsoluteUrl(categoryPath),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: itemUrl,
      },
    ],
  };
}

/**
 * Generates WebSite Schema with SearchAction for Sitelinks Searchbox in Google SERPs.
 */
export function buildWebSiteJsonLd(): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: getSiteUrl(),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${getSiteUrl()}/browse/movie?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Generates Schema.org Movie structured data with compliant WatchAction EntryPoint.
 */
export function buildMovieJsonLd(movie: MovieDetails): JsonLdData {
  const url = buildAbsoluteUrl(getMediaHref("movie", movie.id, movie.title));
  const playUrl = `${url}?play=true`;
  const image = getMediaOpenGraphImageUrl(movie);

  const jsonLd: JsonLdData = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    description: movie.overview,
    url,
    inLanguage: "en",
    potentialAction: {
      "@type": "WatchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: playUrl,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
          "http://schema.org/AndroidPlatform",
          "http://schema.org/IOSPlatform",
        ],
      },
      actionAccessibilityRequirement: {
        "@type": "ActionAccessSpecification",
        category: "free",
        availabilityStarts: movie.releaseDate || undefined,
      },
    },
  };

  if (image) {
    jsonLd.image = image;
  }

  if (movie.releaseDate) {
    jsonLd.datePublished = movie.releaseDate;
  }

  if (movie.voteCount > 0 && movie.voteAverage > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Math.round(movie.voteAverage * 10) / 10,
      bestRating: 10,
      worstRating: 1,
      ratingCount: movie.voteCount,
    };
  }

  if (movie.genres && movie.genres.length > 0) {
    jsonLd.genre = movie.genres.map((g) => g.name);
  }

  if (movie.cast && movie.cast.length > 0) {
    jsonLd.actor = movie.cast.slice(0, 5).map((actor) => ({
      "@type": "Person",
      name: actor.name,
    }));
  }

  if (movie.crew && movie.crew.length > 0) {
    const directors = movie.crew.filter((c) => c.job === "Director");
    if (directors.length > 0) {
      jsonLd.director = directors.map((d) => ({
        "@type": "Person",
        name: d.name,
      }));
    }
  }

  return jsonLd;
}

/**
 * Generates Schema.org TVSeries structured data with Season & Episode hierarchy siloing.
 */
export function buildTvSeriesJsonLd(tv: TvDetails): JsonLdData {
  const url = buildAbsoluteUrl(getMediaHref("tv", tv.id, tv.title));
  const playUrl = `${url}?play=true`;
  const image = getMediaOpenGraphImageUrl(tv);

  const jsonLd: JsonLdData = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: tv.title,
    description: tv.overview,
    url,
    inLanguage: "en",
    numberOfSeasons: tv.numberOfSeasons || tv.seasons?.length || 1,
    numberOfEpisodes: tv.numberOfEpisodes || undefined,
    potentialAction: {
      "@type": "WatchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: playUrl,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
          "http://schema.org/AndroidPlatform",
          "http://schema.org/IOSPlatform",
        ],
      },
      actionAccessibilityRequirement: {
        "@type": "ActionAccessSpecification",
        category: "free",
        availabilityStarts: tv.releaseDate || undefined,
      },
    },
  };

  if (image) {
    jsonLd.image = image;
  }

  if (tv.releaseDate) {
    jsonLd.datePublished = tv.releaseDate;
  }

  if (tv.voteCount > 0 && tv.voteAverage > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Math.round(tv.voteAverage * 10) / 10,
      bestRating: 10,
      worstRating: 1,
      ratingCount: tv.voteCount,
    };
  }

  if (tv.genres && tv.genres.length > 0) {
    jsonLd.genre = tv.genres.map((g) => g.name);
  }

  if (tv.cast && tv.cast.length > 0) {
    jsonLd.actor = tv.cast.slice(0, 5).map((actor) => ({
      "@type": "Person",
      name: actor.name,
    }));
  }

  // Deep Season hierarchy markup (containsSeason)
  if (tv.seasons && tv.seasons.length > 0) {
    jsonLd.containsSeason = tv.seasons
      .filter((s) => s.seasonNumber > 0)
      .map((s) => ({
        "@type": "TVSeason",
        name: s.name || `Season ${s.seasonNumber}`,
        seasonNumber: s.seasonNumber,
        numberOfEpisodes: s.episodeCount,
        ...(s.airDate ? { datePublished: s.airDate } : {}),
      }));
  }

  return jsonLd;
}
