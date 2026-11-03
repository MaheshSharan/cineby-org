import type { MovieDetails, TvDetails } from "@/lib/tmdb";
import { buildAbsoluteUrl, SITE_NAME } from "@/lib/seo/site";
import { getSiteUrl } from "@/lib/env/public";
import { getMediaHref } from "@/lib/utils/media";
import { getMediaOpenGraphImageUrl } from "@/lib/seo/media";
import { getSportWatchHref } from "@/lib/sports/types";

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
 * Generates SiteNavigationElement schema for Google SERP expanded sitelinks (sub-navigation under search result).
 */
export function buildSiteNavigationJsonLd(): JsonLdData {
  const baseUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [
      {
        "@type": "SiteNavigationElement",
        position: 1,
        name: "Movies",
        description: "Browse popular movies, trending releases and top-rated cinema.",
        url: `${baseUrl}/browse/movie`,
      },
      {
        "@type": "SiteNavigationElement",
        position: 2,
        name: "TV Shows",
        description: "Explore trending television series, dramas, and anime episodes.",
        url: `${baseUrl}/browse/tv`,
      },
      {
        "@type": "SiteNavigationElement",
        position: 3,
        name: "Editorial & Guides",
        description: "Expert streaming guides, movie recommendations, and buffering fixes.",
        url: `${baseUrl}/blog`,
      },
      {
        "@type": "SiteNavigationElement",
        position: 4,
        name: "Watchlist",
        description: "Save and organize your favorite movies and shows to watch later.",
        url: `${baseUrl}/watchlist`,
      },
    ],
  };
}

/**
 * Generates Schema.org BlogPosting for E-E-A-T search engine validation.
 */
export function buildBlogPostJsonLd(post: {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  author: { name: string; role?: string };
  coverImage?: string;
}): JsonLdData {
  const postUrl = buildAbsoluteUrl(`/blog/${post.slug}`);
  const imageUrl = post.coverImage ? buildAbsoluteUrl(post.coverImage) : buildAbsoluteUrl("/screenshots/home-wide.png");

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: imageUrl,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
    author: {
      "@type": "Person",
      name: post.author.name,
      jobTitle: post.author.role,
      url: getSiteUrl(),
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: buildAbsoluteUrl("/logo.png"),
      },
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

export interface SportsEventInput {
  name: string;
  category_name?: string;
  tag?: string;
  uri_name: string;
  starts_at?: number;
  ends_at?: number;
  poster?: string;
}

/**
 * Generates Schema.org SportsEvent structured data compliant with Google Search Console rich result guidelines.
 * Solves missing startDate, endDate, location (VirtualLocation), offers, organizer, and performer warnings.
 */
export function buildSportsEventJsonLd(
  match: SportsEventInput,
  options?: { nowMs?: number }
): JsonLdData {
  const pagePath = getSportWatchHref(match.uri_name || "");
  const pageUrl = buildAbsoluteUrl(pagePath);
  const now = options?.nowMs !== undefined ? new Date(options.nowMs) : new Date();

  // Deterministic rolling broadcast window start if starts_at is absent or 0 (common for 24/7 channels)
  let startIso: string;
  let endIso: string;

  if (match.starts_at && match.starts_at > 0) {
    const startDate = new Date(match.starts_at * 1000);
    startIso = startDate.toISOString();
    if (match.ends_at && match.ends_at > 0) {
      endIso = new Date(match.ends_at * 1000).toISOString();
    } else {
      // Fallback: 3 hours after start
      endIso = new Date(startDate.getTime() + 3 * 60 * 60 * 1000).toISOString();
    }
  } else {
    // Continuous 24/7 channel: UTC day start to UTC day end
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    startIso = startOfDay.toISOString();
    endIso = endOfDay.toISOString();
  }

  const imageUrl = match.poster && match.poster.trim()
    ? (match.poster.startsWith("http://") || match.poster.startsWith("https://")
        ? match.poster
        : buildAbsoluteUrl(match.poster))
    : buildAbsoluteUrl("/screenshots/home-wide.png");

  // Extract performers if match name represents a matchup (e.g. "Arsenal vs Chelsea" or "Lecce - Empoli")
  const performers: Array<{ "@type": "SportsTeam"; name: string }> = [];
  const vsMatch = match.name.match(/^(.+?)\s+(?:vs\.?|v|-)\s+(.+?)$/i);
  if (vsMatch && vsMatch[1] && vsMatch[2]) {
    performers.push(
      { "@type": "SportsTeam", name: vsMatch[1].trim() },
      { "@type": "SportsTeam", name: vsMatch[2].trim() }
    );
  }

  const category = match.category_name || "Sports";
  const tagDesc = match.tag ? ` - ${match.tag}` : "";

  const jsonLd: JsonLdData = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: match.name,
    description: `Watch ${match.name} live stream free online in HD on ${SITE_NAME}. High quality streams for ${category}${tagDesc}.`,
    startDate: startIso,
    endDate: endIso,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    image: imageUrl,
    location: {
      "@type": "VirtualLocation",
      url: pageUrl,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      validFrom: startIso,
      url: pageUrl,
    },
    organizer: {
      "@type": "Organization",
      name: SITE_NAME,
      url: getSiteUrl(),
    },
  };

  if (match.category_name) {
    jsonLd.sport = match.category_name;
  }

  if (performers.length > 0) {
    jsonLd.performer = performers;
  }

  return jsonLd;
}

