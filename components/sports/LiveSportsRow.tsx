import { useEffect, useState } from "react";
import Link from "next/link";
import { ContentRow } from "@/components/content/ContentRow";
import { SportCard } from "./SportCard";
import type { SportMatch } from "@/lib/sports/types";
import { getHomepageDiversifiedMatches } from "@/lib/sports/sportsService";
import { useInView } from "@/hooks/useInView";
import { fetchSportsClientSide } from "@/hooks/useSportsData";

interface LiveSportsRowProps {
  initialMatches?: SportMatch[];
  sourceLocation?: "homepage_row" | "related_matches";
}

export function LiveSportsRow({ initialMatches, sourceLocation = "homepage_row" }: LiveSportsRowProps) {
  const { ref, isInView } = useInView();
  const [matches, setMatches] = useState<SportMatch[]>(
    initialMatches ? getHomepageDiversifiedMatches(initialMatches, 15) : []
  );
  const [isLoading, setIsLoading] = useState(!initialMatches || initialMatches.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      const data = await fetchSportsClientSide(true);
      if (data) {
        const liveItems = Array.isArray(data.liveNow) && data.liveNow.length > 0 ? data.liveNow : data.all ?? [];
        setMatches(getHomepageDiversifiedMatches(liveItems, 15));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (initialMatches && initialMatches.length > 0) {
      setMatches(getHomepageDiversifiedMatches(initialMatches, 15));
      setIsLoading(false);
      return;
    }

    if (!isInView) return;

    let isCurrent = true;
    setIsLoading(true);

    fetchSportsClientSide()
      .then((data) => {
        if (!isCurrent || !data) return;
        const liveItems = Array.isArray(data.liveNow) && data.liveNow.length > 0 ? data.liveNow : data.all ?? [];
        setMatches(getHomepageDiversifiedMatches(liveItems, 15));
      })
      .catch(() => {})
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isInView, initialMatches]);

  if (isLoading || matches.length === 0) {
    return <div ref={ref} className="h-0 w-full overflow-hidden pointer-events-none" aria-hidden="true" />;
  }

  const headerAction = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all duration-200 ${
          isRefreshing
            ? "bg-white/10 text-white/50 border-white/10 cursor-not-allowed"
            : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border-white/10 active:scale-95"
        }`}
        title="Refresh live match scores and streams"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isRefreshing ? "animate-spin text-primary" : ""}
        >
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 16h5v5" />
        </svg>
        <span>{isRefreshing ? "Updating..." : "Refresh"}</span>
      </button>

      <Link
        href="/sports"
        className="flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white transition-colors duration-200"
      >
        <span>View All Sports</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </Link>
    </div>
  );

  const titleWithLiveBadge = (
    <div className="flex items-center gap-2.5">
      <span>Live Sports & Matches</span>
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
      </span>
    </div>
  );

  return (
    <div ref={ref} className="relative z-10 group/row">
      <ContentRow title={titleWithLiveBadge} action={headerAction}>
        {matches.map((match) => (
          <SportCard
            key={`${match.id}-${match.uri_name}`}
            match={match}
            variant="row"
            sourceLocation={sourceLocation}
          />
        ))}
      </ContentRow>
    </div>
  );
}
