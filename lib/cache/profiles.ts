/**
 * The single place that decides how long anything is cached.
 *
 * Every Cache-Control header, every Worker data-cache TTL, every ISR interval and every client-side
 * data-cache TTL is read from this table, so a route can never promise a lifetime the cache does not keep.
 * `tests/cache-config.test.ts` fails if a cache header or TTL literal appears anywhere else.
 */

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

interface CacheProfile {
  /** Seconds a browser keeps the response without contacting the Worker (max-age). */
  browser: number;
  /** Seconds shared caches and the Worker's edge cache keep it (s-maxage). 0 leaves the directive out. */
  edge: number;
  /** Seconds a shared cache may serve it stale while refreshing (stale-while-revalidate). 0 leaves it out. */
  revalidate: number;
  immutable?: boolean;
  /** Seconds the Worker's data cache keeps the value. Defaults to `edge`. */
  ttl?: number;
  /** After this many seconds the data cache still serves the value but refreshes it in the background. */
  refreshAfter?: number;
}

export const CACHE_PROFILES = {
  // Server-rendered pages. Their HTML holds no data that changes within a day.
  page: { browser: DAY, edge: DAY, revalidate: DAY },
  home: { browser: 12 * HOUR, edge: DAY, revalidate: DAY },
  sitemap: { browser: HOUR, edge: DAY, revalidate: 12 * HOUR },

  // TMDB data.
  trending: { browser: HOUR, edge: 2 * DAY, revalidate: 2 * DAY, refreshAfter: DAY },
  discover: { browser: HOUR, edge: DAY, revalidate: DAY, refreshAfter: HOUR },
  search: { browser: 10 * MINUTE, edge: HOUR, revalidate: DAY, refreshAfter: 10 * MINUTE },
  genres: { browser: DAY, edge: 7 * DAY, revalidate: 7 * DAY },
  movieDetails: { browser: 10 * MINUTE, edge: DAY, revalidate: 12 * HOUR, refreshAfter: 3 * HOUR },
  tvDetails: { browser: 10 * MINUTE, edge: DAY, revalidate: 12 * HOUR, refreshAfter: 3 * HOUR },
  seasonEpisodes: { browser: 10 * MINUTE, edge: HOUR, revalidate: DAY, refreshAfter: 30 * MINUTE },
  logo: { browser: HOUR, edge: DAY, revalidate: 12 * HOUR },

  // Live sports. Matches change about every 15 minutes, so 5 minutes keeps the list fresh. Whether a match
  // is live or upcoming is computed in the browser from its start and end time, so it needs no refetch.
  sportsData: { browser: 5 * MINUTE, edge: 5 * MINUTE, revalidate: 10 * MINUTE, ttl: 10 * MINUTE, refreshAfter: 5 * MINUTE },

  trailer: { browser: DAY, edge: DAY, revalidate: 7 * DAY, ttl: 7 * DAY, refreshAfter: 3 * DAY },
  trailerMiss: { browser: MINUTE, edge: MINUTE, revalidate: 0, ttl: 5 * MINUTE },
  flag: { browser: 7 * DAY, edge: 7 * DAY, revalidate: 0, immutable: true, refreshAfter: DAY },
  flagMiss: { browser: 5 * MINUTE, edge: 0, revalidate: 0 },
  playerConfig: { browser: MINUTE, edge: MINUTE, revalidate: 0 },
} as const satisfies Record<string, CacheProfile>;

export type CacheProfileName = keyof typeof CACHE_PROFILES;

/** For responses that depend on the signed-in user and must never be stored by a shared cache. */
export const PRIVATE_CACHE_CONTROL = "private, max-age=0, must-revalidate";

/** For personal data and errors: no cache, including the browser's, may keep a copy. */
export const NO_STORE_CACHE_CONTROL = "private, no-store";

function readProfile(name: CacheProfileName): CacheProfile {
  return CACHE_PROFILES[name];
}

export function cacheControl(name: CacheProfileName): string {
  const { browser, edge, revalidate, immutable } = readProfile(name);

  return [
    "public",
    `max-age=${browser}`,
    edge > 0 ? `s-maxage=${edge}` : null,
    revalidate > 0 ? `stale-while-revalidate=${revalidate}` : null,
    immutable ? "immutable" : null,
  ]
    .filter((directive) => directive !== null)
    .join(", ");
}

/** Seconds shared caches keep the response. Also the ISR interval of a statically generated page. */
export function edgeTtl(name: CacheProfileName): number {
  return readProfile(name).edge;
}

/** Seconds the Worker's data cache keeps the value. */
export function storeTtl(name: CacheProfileName): number {
  const { ttl, edge } = readProfile(name);
  return ttl ?? edge;
}

/** Seconds after which the data cache refreshes the value in the background, if it does. */
export function refreshAfter(name: CacheProfileName): number | undefined {
  return readProfile(name).refreshAfter;
}

/** Milliseconds a client-side copy of the data may be reused: the same time a browser may keep the response. */
export function browserTtlMs(name: CacheProfileName): number {
  return readProfile(name).browser * 1000;
}
