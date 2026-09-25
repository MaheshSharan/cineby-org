import { useEffect, useState } from "react";
import type { MediaSummary } from "@/lib/tmdb";
import { ContentRow } from "@/components/content/ContentRow";
import { MovieCard } from "@/components/movie/MovieCard";
import { TopOneCard } from "@/components/movie/TopOneCard";
import { useInView } from "@/hooks/useInView";

interface TopTenRowProps {
  items?: MediaSummary[];
}

export function TopTenRow({ items: initialItems }: TopTenRowProps) {
  const { ref, isInView } = useInView();
  const [items, setItems] = useState<MediaSummary[]>(initialItems ?? []);
  const [isLoading, setIsLoading] = useState(!initialItems || initialItems.length === 0);

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setItems(initialItems);
      setIsLoading(false);
      return;
    }

    if (!isInView) return;

    let isCurrent = true;
    setIsLoading(true);

    fetch("/api/tmdb/trending?mediaType=all&timeWindow=week")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isCurrent) return;
        const results = Array.isArray(data?.results) ? data.results.slice(0, 10) : [];
        setItems(results);
      })
      .catch(() => {})
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isInView, initialItems]);

  const [topOne, ...rest] = items;

  return (
    <div ref={ref}>
      <ContentRow
        title={
          <div className="flex flex-col">
            <span className="text-xl md:text-2xl font-semibold text-text-hi">
              TOP 10 on Cineby
            </span>
            <span className="text-[13px] md:text-sm font-normal text-text-mid mt-0.5">
              The most watched titles right now
            </span>
          </div>
        }
      >
        {isLoading && items.length === 0 ? (
          <>
            {/* Top 1 wide skeleton */}
            <div className="h-[220px] xs:h-[240px] md:h-[270px] lg:h-[300px] w-[280px] xs:w-[340px] md:w-[480px] lg:w-[616px] flex-shrink-0 animate-pulse rounded-xl bg-white/5" />
            {/* Remaining poster skeletons */}
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[2/3] w-[140px] xs:w-[150px] md:w-[180px] lg:w-[200px] flex-shrink-0 animate-pulse rounded-xl bg-white/5"
              />
            ))}
          </>
        ) : (
          <>
            {topOne ? <TopOneCard media={topOne} /> : null}
            {rest.map((item, index) => (
              <MovieCard
                key={`${item.mediaType || "media"}-${item.id}`}
                media={item}
                variant="poster"
                rank={index + 2}
              />
            ))}
          </>
        )}
      </ContentRow>
    </div>
  );
}