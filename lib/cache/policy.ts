/**
 * Centralized TMDB Cache Policies, TTLs, and Key Builders.
 */

export const TMDB_CACHE_VERSION = "v3";

const HOUR_SECONDS = 60 * 60;
const DAY_SECONDS = 24 * HOUR_SECONDS;

/**
 * How long each kind of TMDB data may be reused.
 * - browser: how long a browser keeps the response without contacting the Worker (max-age)
 * - edge: how long shared caches and the Worker's own cache keep it (s-maxage and cache TTL)
 * - revalidate: how long a shared cache may serve it stale while refreshing (stale-while-revalidate)
 *
 * The Cache-Control headers and the internal cache TTLs are both derived from this table,
 * so a route can never promise a different lifetime than the cache actually keeps.
 */
export const TMDB_CACHE_PROFILES = {
  trending: { browser: HOUR_SECONDS, edge: 2 * DAY_SECONDS, revalidate: 2 * DAY_SECONDS },
  discover: { browser: HOUR_SECONDS, edge: DAY_SECONDS, revalidate: DAY_SECONDS },
  search: { browser: 10 * 60, edge: HOUR_SECONDS, revalidate: DAY_SECONDS },
  genres: { browser: DAY_SECONDS, edge: 7 * DAY_SECONDS, revalidate: 7 * DAY_SECONDS },
  movieDetails: { browser: 10 * 60, edge: DAY_SECONDS, revalidate: 12 * HOUR_SECONDS },
  tvDetails: { browser: 10 * 60, edge: DAY_SECONDS, revalidate: 12 * HOUR_SECONDS },
  seasonEpisodes: { browser: 10 * 60, edge: HOUR_SECONDS, revalidate: DAY_SECONDS },
  logo: { browser: HOUR_SECONDS, edge: DAY_SECONDS, revalidate: 12 * HOUR_SECONDS },
} as const;

export type TmdbCacheKind = keyof typeof TMDB_CACHE_PROFILES;

export function buildTmdbCacheControl(kind: TmdbCacheKind): string {
  const { browser, edge, revalidate } = TMDB_CACHE_PROFILES[kind];
  return `public, max-age=${browser}, s-maxage=${edge}, stale-while-revalidate=${revalidate}`;
}

export const TMDB_TTL_SECONDS = {
  trending: TMDB_CACHE_PROFILES.trending.edge,
  discover: TMDB_CACHE_PROFILES.discover.edge,
  search: TMDB_CACHE_PROFILES.search.edge,
  genres: TMDB_CACHE_PROFILES.genres.edge,
  movieDetails: TMDB_CACHE_PROFILES.movieDetails.edge,
  tvDetails: TMDB_CACHE_PROFILES.tvDetails.edge,
  seasonEpisodes: TMDB_CACHE_PROFILES.seasonEpisodes.edge,
  credits: DAY_SECONDS,
  recommendations: DAY_SECONDS,
  negative: 60, // 1 minute negative caching for 404s
} as const;

// After this long a cached value is still served, but refreshed in the background.
export const TMDB_STALE_SECONDS = {
  trending: DAY_SECONDS, // Lock hero & trending lists to full 24 hours before background refresh
  discover: HOUR_SECONDS,
  search: 10 * 60,
  movieDetails: 3 * HOUR_SECONDS,
  tvDetails: 3 * HOUR_SECONDS,
  seasonEpisodes: 30 * 60,
} as const;

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
  mediaLogo: (mediaType: string, id: string | number) =>
    `tmdb:${TMDB_CACHE_VERSION}:logo:${clean(mediaType)}:${clean(id)}`,
};
