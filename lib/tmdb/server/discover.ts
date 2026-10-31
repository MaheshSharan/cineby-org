import type { MediaSummary, MediaType, Paginated } from "../types";
import { tmdbGet } from "./client";
import { getTmdbConfig } from "./config";
import { toMediaSummary, toPaginated } from "./transform";
import { validatePaginatedResponse } from "./validate";
import { cachedFetch, TMDB_TTL_SECONDS, TMDB_STALE_SECONDS, tmdbCacheKeys } from "@/lib/cache";

export interface DiscoverOptions {
  genreId?: number;
  providerId?: number;
  watchRegion?: string;
  sortBy?: string;
  page?: number;
  year?: number;
  voteCountGte?: number;
  voteAverageGte?: number;
  withKeywords?: string;
  releaseDateGte?: string;
  releaseDateLte?: string;
}

export async function discoverMovies(options: DiscoverOptions = {}): Promise<Paginated<MediaSummary>> {
  return discover("/discover/movie", "movie", options);
}

export async function discoverTv(options: DiscoverOptions = {}): Promise<Paginated<MediaSummary>> {
  return discover("/discover/tv", "tv", options);
}

export interface UpcomingOptions {
  mediaType: MediaType;
  daysAhead?: number;
  page?: number;
}

export async function getUpcomingMedia({
  mediaType,
  daysAhead = 35,
  page = 1,
}: UpcomingOptions): Promise<Paginated<MediaSummary>> {
  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  const todayStr = formatDate(now);
  const futureStr = formatDate(future);

  if (mediaType === "movie") {
    return discoverMovies({
      page,
      sortBy: "popularity.desc",
      releaseDateGte: todayStr,
      releaseDateLte: futureStr,
    });
  }

  return discoverTv({
    page,
    sortBy: "popularity.desc",
    releaseDateGte: todayStr,
    releaseDateLte: futureStr,
  });
}

async function discover(
  path: string,
  mediaType: MediaType,
  options: DiscoverOptions
): Promise<Paginated<MediaSummary>> {
  const queryStr = `g${options.genreId ?? 0}_p${options.providerId ?? 0}_s${options.sortBy ?? "pop"}_pg${options.page ?? 1}_y${options.year ?? 0}_vc${options.voteCountGte ?? 0}_va${options.voteAverageGte ?? 0}_k${options.withKeywords ?? ""}_dg${options.releaseDateGte ?? ""}_dl${options.releaseDateLte ?? ""}`;

  return cachedFetch({
    key: tmdbCacheKeys.discover(mediaType, queryStr),
    ttlSeconds: TMDB_TTL_SECONDS.discover,
    staleSeconds: TMDB_STALE_SECONDS.discover,
    fetcher: async () => {
      const { defaultLanguage } = getTmdbConfig();

      const dateParams: Record<string, string | undefined> =
        mediaType === "movie"
          ? {
              "primary_release_date.gte": options.releaseDateGte,
              "primary_release_date.lte": options.releaseDateLte,
            }
          : {
              "first_air_date.gte": options.releaseDateGte,
              "first_air_date.lte": options.releaseDateLte,
            };

      const raw = await tmdbGet<unknown>({
        path,
        params: {
          language: defaultLanguage,
          sort_by: options.sortBy ?? "popularity.desc",
          page: options.page ?? 1,
          with_genres: options.genreId,
          with_watch_providers: options.providerId,
          watch_region: options.providerId ? (options.watchRegion ?? "US") : undefined,
          year: options.year,
          "vote_count.gte": options.voteCountGte,
          "vote_average.gte": options.voteAverageGte,
          with_keywords: options.withKeywords,
          ...dateParams,
        },
      });

      const { results, totalPages, totalResults } = validatePaginatedResponse(raw);

      return toPaginated(results, options.page ?? 1, totalPages, totalResults, (item) =>
        toMediaSummary(item, mediaType)
      );
    },
  });
}