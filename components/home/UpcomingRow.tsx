import { useState } from "react";
import type { MediaSummary } from "@/lib/tmdb";
import { ContentRow } from "@/components/content/ContentRow";
import { MovieCard } from "@/components/movie/MovieCard";
import { Tabs, type TabOption } from "@/components/ui/Tabs";
import { useDeferredItems } from "@/hooks/useDeferredItems";

// Enough to fill a wide desktop row; the rest of the list appears once the browser is idle.
const INITIAL_CARD_COUNT = 8;

interface UpcomingRowProps {
  movies: MediaSummary[];
  tv: MediaSummary[];
}

export function UpcomingRow({ movies, tv }: UpcomingRowProps) {
  const [activeTab, setActiveTab] = useState<string>("movies");

  const options: TabOption[] = [
    { key: "movies", label: "Movies" },
    { key: "tv", label: "TV Series" },
  ];

  const currentItems = activeTab === "movies" ? movies : tv;
  const visibleItems = useDeferredItems(currentItems, INITIAL_CARD_COUNT);

  if (!movies.length && !tv.length) {
    return null;
  }

  const customHeader = (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <h2 className="heading-trail text-xl md:text-2xl font-semibold text-text-hi">
          Coming Soon
        </h2>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-white/[0.12] to-white/[0.04] text-white/90 border border-white/15 backdrop-blur-md shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
          Next 30 Days
        </span>
      </div>
      <p className="text-[13px] md:text-sm font-normal text-text-mid mt-0.5">
        Most anticipated releases hitting theaters and streaming
      </p>
    </div>
  );

  return (
    <div id="upcoming-section" className="scroll-mt-24">
      <ContentRow
        headerSlot={customHeader}
        action={<Tabs options={options} activeKey={activeTab} onChange={setActiveTab} />}
      >
        {visibleItems.map((item) => (
          <MovieCard
            key={`${item.mediaType || activeTab}-${item.id}`}
            media={{ ...item, mediaType: (item.mediaType || (activeTab === "movies" ? "movie" : "tv")) }}
            variant="poster"
          />
        ))}
      </ContentRow>
    </div>
  );
}
