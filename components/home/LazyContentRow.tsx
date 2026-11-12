import { useEffect, useState, type ReactNode } from "react";
import type { MediaSummary } from "@/lib/tmdb";
import { ContentRow } from "@/components/content/ContentRow";
import { MovieCard } from "@/components/movie/MovieCard";
import { useInView } from "@/hooks/useInView";
import { useDeferredItems } from "@/hooks/useDeferredItems";
import { getRowItems } from "@/lib/api/tmdb";

// Enough to fill a wide desktop row; the rest of the list appears once the browser is idle.
const INITIAL_CARD_COUNT = 8;

interface LazyContentRowProps {
  title: ReactNode;
  fetchUrl?: string;
  initialItems?: MediaSummary[];
  action?: ReactNode;
  className?: string;
}

export function LazyContentRow({
  title,
  fetchUrl,
  initialItems,
  action,
  className = "",
}: LazyContentRowProps) {
  const { ref, isInView } = useInView();
  const [items, setItems] = useState<MediaSummary[]>(initialItems ?? []);
  const [isLoading, setIsLoading] = useState(!initialItems || initialItems.length === 0);
  const visibleItems = useDeferredItems(items, INITIAL_CARD_COUNT);

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setItems(initialItems);
      setIsLoading(false);
      return;
    }

    if (!isInView || !fetchUrl) return;

    let isCurrent = true;
    setIsLoading(true);

    getRowItems(fetchUrl)
      .then((results) => {
        if (!isCurrent) return;
        setItems(results);
      })
      .catch(() => {})
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isInView, fetchUrl, initialItems]);

  return (
    <div ref={ref} className={className}>
      <ContentRow title={title} action={action}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[2/3] w-[140px] xs:w-[150px] md:w-[180px] lg:w-[200px] flex-shrink-0 animate-pulse rounded-xl bg-white/5"
              />
            ))
          : visibleItems.map((item) => (
              <MovieCard key={`${item.mediaType || "media"}-${item.id}`} media={item} variant="catalog" />
            ))}
      </ContentRow>
    </div>
  );
}
