import type {
  MediaSummary,
  Paginated,
  SeasonEpisodes,
  TvDetails,
} from "../types";
import { tmdbGet } from "./client";
import { getTmdbConfig } from "./config";
import {
  toMediaSummary,
  toPaginated,
  toSeasonEpisodes,
  toTvDetails,
} from "./transform";
import {
  validatePaginatedResponse,
  validateSeasonEpisodes,
  validateTvDetails,
} from "./validate";
import { cachedFetch, tmdbCacheKeys } from "@/lib/cache";

const TV_DETAILS_APPEND =
  "credits,external_ids,videos,recommendations,similar,content_ratings,images";

export async function getTvDetails(id: string | number): Promise<TvDetails> {
  return cachedFetch({
    key: tmdbCacheKeys.tvDetails(id),
    profile: "tvDetails",
    fetcher: async () => {
      const { defaultLanguage } = getTmdbConfig();

      const raw = await tmdbGet<unknown>({
        path: `/tv/${id}`,
        params: {
          language: defaultLanguage,
          append_to_response: TV_DETAILS_APPEND,
          include_video_language: "en,null",
          include_image_language: "en,null",
        },
      });

      return toTvDetails(validateTvDetails(raw));
    },
  });
}

export async function getSeasonEpisodes(
  id: string | number,
  seasonNumber: string | number
): Promise<SeasonEpisodes> {
  return cachedFetch({
    key: tmdbCacheKeys.seasonEpisodes(id, seasonNumber),
    profile: "seasonEpisodes",
    fetcher: async () => {
      const { defaultLanguage } = getTmdbConfig();

      const raw = await tmdbGet<unknown>({
        path: `/tv/${id}/season/${seasonNumber}`,
        params: { language: defaultLanguage },
      });

      return toSeasonEpisodes(validateSeasonEpisodes(raw));
    },
  });
}

export async function getPopularTv(page = 1): Promise<Paginated<MediaSummary>> {
  return cachedFetch({
    key: tmdbCacheKeys.popularTv(page),
    profile: "discover",
    fetcher: async () => {
      const { defaultLanguage } = getTmdbConfig();

      const raw = await tmdbGet<unknown>({
        path: "/tv/popular",
        params: { language: defaultLanguage, page },
      });

      const { results, totalPages, totalResults } = validatePaginatedResponse(raw);

      return toPaginated(results, page, totalPages, totalResults, (item) => toMediaSummary(item, "tv"));
    },
  });
}

export async function getTopRatedTv(page = 1): Promise<Paginated<MediaSummary>> {
  return cachedFetch({
    key: tmdbCacheKeys.topRatedTv(page),
    profile: "discover",
    fetcher: async () => {
      const { defaultLanguage } = getTmdbConfig();

      const raw = await tmdbGet<unknown>({
        path: "/tv/top_rated",
        params: { language: defaultLanguage, page },
      });

      const { results, totalPages, totalResults } = validatePaginatedResponse(raw);

      return toPaginated(results, page, totalPages, totalResults, (item) => toMediaSummary(item, "tv"));
    },
  });
}