import type { MediaSummary, MediaType, Paginated } from "../types";
import { discoverMovies, discoverTv } from "./discover";
import { getTopRatedMovies } from "./movies";
import { getTopRatedTv } from "./tv";

import { BROWSE_PAGE_SIZE } from "@/lib/browse/constants";

// TMDB's own page size.
const TMDB_PAGE_SIZE = 20;
// Extra TMDB pages read so that dropped duplicates and posterless titles never leave a page short.
const TMDB_PAGE_BUFFER = 1;

export interface BrowseOptions {
  mediaType: MediaType;
  genreId?: number;
  sortBy?: string;
  page: number;
}

async function fetchTmdbPage({ mediaType, genreId, sortBy }: BrowseOptions, page: number) {
  const isTopRated = !genreId && (sortBy === "vote_average.desc" || sortBy === "top_rated");

  if (isTopRated) {
    return mediaType === "tv" ? getTopRatedTv(page) : getTopRatedMovies(page);
  }

  return mediaType === "tv" ? discoverTv({ genreId, sortBy, page }) : discoverMovies({ genreId, sortBy, page });
}

/** Keeps the first occurrence of each title and drops titles that have no poster to show. */
export function dedupeBrowseItems(items: MediaSummary[]): MediaSummary[] {
  const seen = new Set<number>();

  return items.filter((item) => {
    if (!item.posterPath || seen.has(item.id)) return false;

    seen.add(item.id);
    return true;
  });
}

/**
 * One browse page of BROWSE_PAGE_SIZE items. TMDB pages hold 20 and can repeat a title across neighbouring
 * pages, so the whole list up to this page is read (each TMDB page is cached), de-duplicated in order, and then
 * cut. That keeps every page full and guarantees a title appears on one page only.
 */
export async function getBrowsePage(options: BrowseOptions): Promise<Paginated<MediaSummary>> {
  const firstPage = await fetchTmdbPage(options, 1);
  const wantedTmdbPages = Math.ceil((options.page * BROWSE_PAGE_SIZE) / TMDB_PAGE_SIZE) + TMDB_PAGE_BUFFER;
  const lastTmdbPage = Math.min(wantedTmdbPages, firstPage.totalPages);

  const laterPages = await Promise.all(
    Array.from({ length: Math.max(0, lastTmdbPage - 1) }, (_, offset) => fetchTmdbPage(options, offset + 2))
  );

  const unique = dedupeBrowseItems([firstPage, ...laterPages].flatMap((tmdbPage) => tmdbPage.results));
  const start = (options.page - 1) * BROWSE_PAGE_SIZE;

  return {
    page: options.page,
    results: unique.slice(start, start + BROWSE_PAGE_SIZE),
    totalResults: firstPage.totalResults,
    totalPages: Math.ceil(Math.min(firstPage.totalResults, firstPage.totalPages * TMDB_PAGE_SIZE) / BROWSE_PAGE_SIZE),
  };
}
