import { useCallback, useEffect, useRef, useState } from "react";

import type { Genre, MediaSummary } from "@/lib/tmdb";

import { MovieCard } from "@/components/movie/MovieCard";
import { SkeletonCardGrid } from "@/components/skeleton/SkeletonCard";
import { MediaGrid } from "@/components/ui/MediaGrid";
import { Pagination } from "@/components/ui/Pagination";
import { NativeBannerAd } from "@/components/ads/NativeBannerAd";
import { BrowseFilters, type SortKey } from "@/components/browse/BrowseFilters";
import { browseMedia } from "@/lib/api/tmdb";
import { BROWSE_PAGE_SIZE, MAX_BROWSE_PAGES } from "@/lib/browse/constants";

type MediaType = "movie" | "tv";

interface Filters {
  sortKey: SortKey;
  genreId?: number;
}

interface BrowseGridProps {
  mediaType: MediaType;
  genres: Genre[];
  initialItems: MediaSummary[];
  initialTotalPages: number;
  initialKeywords?: string | null;
}

export function BrowseGrid({ mediaType, genres, initialItems, initialTotalPages, initialKeywords }: BrowseGridProps) {
  const [filters, setFilters] = useState<Filters>({ sortKey: "popular" });
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const gridTopRef = useRef<HTMLDivElement>(null);
  // Only the newest request may update the grid, so a slow earlier one can never overwrite it.
  const latestRequestRef = useRef(0);

  useEffect(() => {
    // Navigating to another category invalidates any request still in flight.
    latestRequestRef.current += 1;
    setIsLoading(false);
    setFilters({ sortKey: "popular" });
    setItems(initialItems);
    setPage(1);
    setTotalPages(initialTotalPages);
  }, [mediaType, initialItems, initialTotalPages, initialKeywords]);

  const fetchPage = useCallback(
    async (targetPage: number, nextFilters: Filters) => {
      const requestId = ++latestRequestRef.current;
      setIsLoading(true);
      setHasError(false);

      const params = new URLSearchParams();
      params.set("mediaType", mediaType);
      params.set("sortBy", toSortBy(nextFilters.sortKey, mediaType));
      params.set("page", String(targetPage));
      // Part of the cache key: responses cached with another page size must never be reused.
      params.set("size", String(BROWSE_PAGE_SIZE));

      if (initialKeywords) {
        params.set("keywords", initialKeywords);
      }

      if (nextFilters.genreId) {
        params.set("genreId", String(nextFilters.genreId));
      }

      try {
        const data = await browseMedia(params);
        if (requestId !== latestRequestRef.current) return;

        setItems(data.results);
        setTotalPages(data.totalPages);
        setPage(targetPage);
      } catch {
        if (requestId === latestRequestRef.current) setHasError(true);
      } finally {
        if (requestId === latestRequestRef.current) setIsLoading(false);
      }
    },
    [mediaType]
  );

  const scrollToGridTop = useCallback(() => {
    gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const applyFilters = useCallback(
    (nextFilters: Filters) => {
      setFilters(nextFilters);
      scrollToGridTop();
      void fetchPage(1, nextFilters);
    },
    [fetchPage, scrollToGridTop]
  );

  const goToPage = useCallback(
    (targetPage: number) => {
      scrollToGridTop();
      void fetchPage(targetPage, filters);
    },
    [fetchPage, filters, scrollToGridTop]
  );

  const pageCount = Math.min(totalPages, MAX_BROWSE_PAGES);

  return (
    <section className="mx-auto w-full max-w-[1360px] overflow-x-hidden px-3 sm:px-4 pt-24 pb-28 md:pt-28 md:pb-12">
      {initialKeywords === "207317" && (
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))] border border-[hsl(var(--accent)/0.3)]">
            <span>🎄</span>
            <span>Christmas {mediaType === "tv" ? "TV Shows" : "Movies"} Collection</span>
          </span>
        </div>
      )}

      <BrowseFilters
        genres={genres}
        sortKey={filters.sortKey}
        genreId={filters.genreId}
        onSortChange={(sortKey) => applyFilters({ sortKey })}
        onGenreChange={(genreId) => applyFilters({ sortKey: "popular", genreId })}
      />

      <div className="w-full max-w-full overflow-hidden my-4">
        <NativeBannerAd />
      </div>

      {/* Grid of Movie/TV Cards */}
      <div ref={gridTopRef} className="scroll-mt-24" aria-hidden="true" />
      {isLoading ? (
        <SkeletonCardGrid count={BROWSE_PAGE_SIZE} isMediaGrid />
      ) : hasError ? (
        <p className="py-12 text-center text-sm text-text-mid">Could not load titles. Pick a page to try again.</p>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-mid">No results found.</p>
      ) : (
        <MediaGrid>
          {items.map((item) => (
            <MovieCard key={`${item.mediaType}-${item.id}`} media={item} variant="catalog" />
          ))}
        </MediaGrid>
      )}

      <Pagination page={page} pageCount={pageCount} isDisabled={isLoading} onPageChange={goToPage} />
    </section>
  );
}

function toSortBy(sortKey: SortKey, mediaType: MediaType): string {
  switch (sortKey) {
    case "rating":
      return "vote_average.desc";
    case "recent":
      return mediaType === "tv" ? "first_air_date.desc" : "release_date.desc";
    case "popular":
    default:
      return "popularity.desc";
  }
}
