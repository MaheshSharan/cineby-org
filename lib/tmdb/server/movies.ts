import type { MediaSummary, MovieDetails, MediaType, Paginated } from "../types";
import { tmdbGet } from "./client";
import { getTmdbConfig } from "./config";
import { toLogoPath, toMediaSummary, toMovieDetails, toPaginated } from "./transform";
import {
  validateMovieDetails,
  validatePaginatedResponse,
} from "./validate";
import { cachedFetch, TMDB_TTL_SECONDS, TMDB_STALE_SECONDS, tmdbCacheKeys } from "@/lib/cache";

export async function getMediaLogo(mediaType: MediaType, id: string | number): Promise<string | null> {
  return cachedFetch({
    key: tmdbCacheKeys.mediaLogo(mediaType, id),
    ttlSeconds: TMDB_TTL_SECONDS.movieDetails,
    staleSeconds: TMDB_STALE_SECONDS.movieDetails,
    fetcher: async () => {
      const raw = await tmdbGet<unknown>({
        path: `/${mediaType}/${id}/images`,
        params: { include_image_language: "en,null" },
      });
      return toLogoPath(raw);
    },
  });
}

const MOVIE_DETAILS_APPEND =
  "credits,external_ids,videos,recommendations,translations,similar,release_dates,images";

export async function getMovieDetails(id: string | number): Promise<MovieDetails> {
  return cachedFetch({
    key: tmdbCacheKeys.movieDetails(id),
    ttlSeconds: TMDB_TTL_SECONDS.movieDetails,
    staleSeconds: TMDB_STALE_SECONDS.movieDetails,
    fetcher: async () => {
      const { defaultLanguage } = getTmdbConfig();

      const raw = await tmdbGet<unknown>({
        path: `/movie/${id}`,
        params: {
          language: defaultLanguage,
          append_to_response: MOVIE_DETAILS_APPEND,
          include_video_language: "en,null",
        },
      });

      return toMovieDetails(validateMovieDetails(raw));
    },
  });
}

export async function getPopularMovies(page = 1): Promise<Paginated<MediaSummary>> {
  return cachedFetch({
    key: tmdbCacheKeys.popularMovies(page),
    ttlSeconds: TMDB_TTL_SECONDS.discover,
    staleSeconds: TMDB_STALE_SECONDS.discover,
    fetcher: async () => {
      const { defaultLanguage } = getTmdbConfig();

      const raw = await tmdbGet<unknown>({
        path: "/movie/popular",
        params: { language: defaultLanguage, page },
      });

      const { results, totalPages, totalResults } = validatePaginatedResponse(raw);

      return toPaginated(results, page, totalPages, totalResults, (item) => toMediaSummary(item, "movie"));
    },
  });
}

export async function getTopRatedMovies(page = 1): Promise<Paginated<MediaSummary>> {
  return cachedFetch({
    key: tmdbCacheKeys.topRatedMovies(page),
    ttlSeconds: TMDB_TTL_SECONDS.discover,
    staleSeconds: TMDB_STALE_SECONDS.discover,
    fetcher: async () => {
      const { defaultLanguage } = getTmdbConfig();

      const raw = await tmdbGet<unknown>({
        path: "/movie/top_rated",
        params: { language: defaultLanguage, page },
      });

      const { results, totalPages, totalResults } = validatePaginatedResponse(raw);

      return toPaginated(results, page, totalPages, totalResults, (item) => toMediaSummary(item, "movie"));
    },
  });
}