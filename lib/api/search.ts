import type { MediaSummary } from "@/lib/tmdb";
import { isSearchableQuery, normalizeSearchQuery } from "@/lib/search/query";

const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const SEARCH_CACHE_MAX_ENTRIES = 50;

interface SearchCacheEntry {
  results: MediaSummary[];
  expiresAt: number;
}

interface SearchResponse {
  results: MediaSummary[];
}

// Insertion-ordered, so the first key is always the least recently used entry.
const recentSearches = new Map<string, SearchCacheEntry>();

function readCachedSearch(normalizedQuery: string): MediaSummary[] | null {
  const entry = recentSearches.get(normalizedQuery);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    recentSearches.delete(normalizedQuery);
    return null;
  }

  recentSearches.delete(normalizedQuery);
  recentSearches.set(normalizedQuery, entry);
  return entry.results;
}

function writeCachedSearch(normalizedQuery: string, results: MediaSummary[]): void {
  recentSearches.delete(normalizedQuery);
  recentSearches.set(normalizedQuery, { results, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });

  if (recentSearches.size > SEARCH_CACHE_MAX_ENTRIES) {
    const oldestKey = recentSearches.keys().next().value;
    if (oldestKey !== undefined) recentSearches.delete(oldestKey);
  }
}

export function clearSearchCache(): void {
  recentSearches.clear();
}

/**
 * Searches TMDB through the API. Queries that are too short return nothing without a request, and
 * repeated queries in the same session are answered from memory.
 */
export async function searchMedia(rawQuery: string, signal?: AbortSignal): Promise<MediaSummary[]> {
  const query = normalizeSearchQuery(rawQuery);
  if (!isSearchableQuery(query)) return [];

  const cached = readCachedSearch(query);
  if (cached) return cached;

  const response = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`, { signal });
  if (!response.ok) {
    throw new Error(`Search request failed: ${response.status}`);
  }

  const data = (await response.json()) as SearchResponse;
  const results = Array.isArray(data.results) ? data.results : [];
  writeCachedSearch(query, results);
  return results;
}
