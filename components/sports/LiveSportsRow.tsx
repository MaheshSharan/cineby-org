import { useEffect, useState } from "react";
import Link from "next/link";
import { ContentRow } from "@/components/content/ContentRow";
import { SportCard } from "./SportCard";
import type { SportMatch } from "@/lib/sports/types";
import { useInView } from "@/hooks/useInView";

interface LiveSportsRowProps {
  initialMatches?: SportMatch[];
}

export function LiveSportsRow({ initialMatches }: LiveSportsRowProps) {
  const { ref, isInView } = useInView();
  const [matches, setMatches] = useState<SportMatch[]>(initialMatches ?? []);
  const [isLoading, setIsLoading] = useState(!initialMatches || initialMatches.length === 0);

  useEffect(() => {
    if (initialMatches && initialMatches.length > 0) {
      setMatches(initialMatches);
      setIsLoading(false);
      return;
    }

    if (!isInView) return;

    let isCurrent = true;
    setIsLoading(true);

    fetch("/api/sports")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isCurrent) return;
        const liveItems = Array.isArray(data?.liveNow) && data.liveNow.length > 0 ? data.liveNow : data?.all ?? [];
        setMatches(liveItems.slice(0, 15));
      })
      .catch(() => {})
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isInView, initialMatches]);

  if (!isLoading && matches.length === 0) {
    return null;
  }

  const headerAction = (
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
        {isLoading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="aspect-video w-[240px] sm:w-[280px] flex-shrink-0 animate-pulse rounded-xl bg-white/5"
              />
            ))
          : matches.map((match) => (
              <SportCard key={`${match.id}-${match.uri_name}`} match={match} variant="row" />
            ))}
      </ContentRow>
    </div>
  );
}
