import type { MovieDetails, TvDetails } from "@/lib/tmdb";
import { buildAbsoluteUrl } from "@/lib/seo/site";
import { getMediaHref } from "@/lib/utils/media";
import { getMediaOpenGraphImageUrl } from "@/lib/seo/media";

type JsonLdData = Record<string, unknown>;

/**
 * Escapes unsafe characters for safe embedding inside a <script type="application/ld+json"> tag.
 * Complies with AGENTS.md §18 (sanitizes against XSS injection via </script> closing tags).
 */
export function sanitizeJsonLd(data: JsonLdData): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Generates Schema.org Movie structured data for Google Search.
 */
export function buildMovieJsonLd(movie: MovieDetails): JsonLdData {
  const url = buildAbsoluteUrl(getMediaHref("movie", movie.id, movie.title));
  const image = getMediaOpenGraphImageUrl(movie);

  const jsonLd: JsonLdData = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    description: movie.overview,
    url,
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
 * Generates Schema.org TVSeries structured data for Google Search.
 */
export function buildTvSeriesJsonLd(tv: TvDetails): JsonLdData {
  const url = buildAbsoluteUrl(getMediaHref("tv", tv.id, tv.title));
  const image = getMediaOpenGraphImageUrl(tv);

  const jsonLd: JsonLdData = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: tv.title,
    description: tv.overview,
    url,
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

  return jsonLd;
}
