/**
 * Centralized TMDB Cache Policies, TTLs, and Key Builders.
 */

export const TMDB_CACHE_VERSION = "v1";

export const TMDB_TTL_SECONDS = {
  trending: 15 * 60, // 15 minutes
  discover: 15 * 60, // 15 minutes
  search: 5 * 60, // 5 minutes
  genres: 24 * 60 * 60, // 24 hours
  movieDetails: 24 * 60 * 60, // 24 hours
  tvDetails: 24 * 60 * 60, // 24 hours
  seasonEpisodes: 24 * 60 * 60, // 24 hours
  credits: 24 * 60 * 60, // 24 hours
  recommendations: 24 * 60 * 60, // 24 hours
  negative: 60, // 1 minute negative caching for 404s
} as const;

export const TMDB_STALE_SECONDS = {
  trending: 5 * 60, // Stale after 5 min
  discover: 5 * 60, // Stale after 5 min
  search: 2 * 60, // Stale after 2 min
  movieDetails: 12 * 60 * 60, // Stale after 12 hours
  tvDetails: 12 * 60 * 60, // Stale after 12 hours
  seasonEpisodes: 12 * 60 * 60, // Stale after 12 hours
} as const;

function clean(part: string | number | undefined): string {
  return String(part ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");
}

export const tmdbCacheKeys = {
  movieDetails: (id: string | number) => `tmdb:${TMDB_CACHE_VERSION}:movie:${clean(id)}`,
  tvDetails: (id: string | number) => `tmdb:${TMDB_CACHE_VERSION}:tv:${clean(id)}`,
  seasonEpisodes: (id: string | number, season: string | number) =>
    `tmdb:${TMDB_CACHE_VERSION}:tv:${clean(id)}:season:${clean(season)}`,
  trending: (mediaType: string, timeWindow: string, page: number) =>
    `tmdb:${TMDB_CACHE_VERSION}:trending:${clean(mediaType)}:${clean(timeWindow)}:p${page}`,
  discover: (mediaType: string, queryStr: string) =>
    `tmdb:${TMDB_CACHE_VERSION}:discover:${clean(mediaType)}:${queryStr}`,
  genres: (mediaType: string) => `tmdb:${TMDB_CACHE_VERSION}:genres:${clean(mediaType)}`,
  search: (query: string, page: number) =>
    `tmdb:${TMDB_CACHE_VERSION}:search:${clean(query)}:p${page}`,
  popularMovies: (page: number) => `tmdb:${TMDB_CACHE_VERSION}:movie:popular:p${page}`,
  topRatedMovies: (page: number) => `tmdb:${TMDB_CACHE_VERSION}:movie:top_rated:p${page}`,
};
