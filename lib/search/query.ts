// Two characters still allows real titles such as "It", "Up" and "Us".
export const MIN_SEARCH_QUERY_LENGTH = 2;
export const MAX_SEARCH_QUERY_LENGTH = 100;

/**
 * One canonical form per search, shared by the browser and the API route. TMDB search ignores case
 * and extra whitespace, so "Dune", "dune " and "DUNE" must all map to the same URL and cache entry.
 */
export function normalizeSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase().slice(0, MAX_SEARCH_QUERY_LENGTH);
}

export function isSearchableQuery(normalizedQuery: string): boolean {
  return normalizedQuery.length >= MIN_SEARCH_QUERY_LENGTH;
}
