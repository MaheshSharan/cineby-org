/**
 * Cache keys for the Worker's data cache, and the rule for which of them are shared through KV.
 * How long a key lives is decided in `./profiles`.
 */

const TMDB_CACHE_VERSION = "v3";

// Shared KV storage has a small daily write allowance. Only the few, widely reused lists are stored
// there; per-title details, seasons and searches stay in each isolate's memory.
const KV_PERSISTED_KEY_PATTERN = /^tmdb:[^:]+:(?:genres|trending|discover):|^tmdb:[^:]+:(?:movie|tv):(?:popular|top_rated):/;

export function isKvPersistedKey(key: string): boolean {
  return KV_PERSISTED_KEY_PATTERN.test(key);
}

function clean(part: string | number | undefined): string {
  return String(part ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");
}

export const appCacheKeys = {
  trailer: (imdbId: string) => `trailer:${imdbId}`,
  flag: (countryCode: string) => `flag:${countryCode}`,
};

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
  popularTv: (page: number) => `tmdb:${TMDB_CACHE_VERSION}:tv:popular:p${page}`,
  topRatedTv: (page: number) => `tmdb:${TMDB_CACHE_VERSION}:tv:top_rated:p${page}`,
  mediaImages: (mediaType: string, id: string | number) =>
    `tmdb:${TMDB_CACHE_VERSION}:images:${clean(mediaType)}:${clean(id)}`,
};
