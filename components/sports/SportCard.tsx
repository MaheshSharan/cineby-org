import Link from "next/link";
import { useEffect, useState } from "react";
import { type SportMatch, getSportWatchHref } from "@/lib/sports/types";
import { isMatchLive } from "@/lib/sports/sportsService";
import { getUsablePosterUrl } from "@/lib/sports/poster";
import { PlayButton } from "@/components/ui/PlayButton";
import { trackEvent } from "@/lib/analytics/gtag";

interface SportCardProps {
  match: SportMatch;
  variant?: "grid" | "row" | "featured";
  sourceLocation?: "sports_hub" | "homepage_row" | "hero_carousel" | "related_matches";
}

function formatCountdown(targetEpochSec: number, nowSec: number): string {
  const diff = targetEpochSec - nowSec;
  if (diff <= 0) return "Starting soon";

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0) {
    return `in ${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `in ${hours}h ${minutes}m`;
  }
  return `in ${minutes}m`;
}

export function SportCard({ match, variant = "grid", sourceLocation = "sports_hub" }: SportCardProps) {
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleMatchClick = () => {
    trackEvent({
      action: "sport_click",
      params: {
        match_id: String(match.id || match.uri_name),
        match_name: match.name,
        sport_category: match.category_name || "Unknown",
        league_tag: match.tag || undefined,
        source_location: sourceLocation,
      },
    });
  };

  // Filter out cards whose poster is missing, invalid, from a host that no longer resolves, or failed to load
  const posterBg = getUsablePosterUrl(match.poster);
  if (!posterBg || imgError) {
    return null;
  }

  const live = isMatchLive(match, nowSec);
  const playHref = getSportWatchHref(match.uri_name);
  const viewersCount = typeof match.viewers === "string" ? Number.parseInt(match.viewers, 10) : Number(match.viewers || 0);

  if (variant === "featured") {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        {posterBg ? (
          <div className="absolute inset-0 -z-10 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={posterBg}
              alt={match.name}
              className="h-full w-full object-cover opacity-20 filter blur-sm scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/70 to-transparent" />
          </div>
        ) : null}

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              {live ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600/90 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                  LIVE NOW
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                  {formatCountdown(match.starts_at, nowSec)}
                </span>
              )}

              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/80 border border-white/10">
                {match.category_name}
              </span>

              {match.tag ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                  {match.tag}
                </span>
              ) : null}

              {live && viewersCount > 0 ? (
                <span className="text-xs text-white/60">
                  {viewersCount.toLocaleString()} watching
                </span>
              ) : null}
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {match.name}
            </h2>

            {match.source_tag ? (
              <p className="text-sm text-white/60 font-medium">
                Broadcast: <span className="text-white/85">{match.source_tag}</span>
              </p>
            ) : null}
          </div>

          <div className="flex-shrink-0" onClick={handleMatchClick}>
            <PlayButton href={playHref} size="lg" label={live ? "Watch Live" : "Open Stream"} />
          </div>
        </div>
      </div>
    );
  }

  const isRow = variant === "row";

  return (
    <Link
      href={playHref}
      onClick={handleMatchClick}
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-all duration-300 hover:scale-[1.02] hover:border-white/25 hover:bg-white/[0.07] hover:shadow-[0_12px_24px_-10px_rgba(0,0,0,0.8)] focus:outline-none focus:ring-2 focus:ring-primary ${
        isRow ? "w-[240px] sm:w-[280px] flex-shrink-0" : "w-full"
      }`}
    >
      {/* Thumbnail Aspect Ratio 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden bg-white/5">
        {posterBg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterBg}
            alt={match.name}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}

        {/* Gradient shadow overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

        {/* Badge: Live / Countdown */}
        <div className="absolute top-2 left-2 z-10">
          {live ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-600 text-white shadow-md">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-black/70 backdrop-blur-md text-white/90 border border-white/15">
              {formatCountdown(match.starts_at, nowSec)}
            </span>
          )}
        </div>

        {/* Category tag */}
        <div className="absolute top-2 right-2 z-10">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/60 backdrop-blur-md text-white/80 border border-white/10">
            {match.category_name}
          </span>
        </div>

        {/* Viewers or source */}
        {live && viewersCount > 0 ? (
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 text-[11px] font-medium text-white/80 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded">
            <span className="h-1 w-1 rounded-full bg-green-400" />
            <span>{viewersCount}</span>
          </div>
        ) : null}
      </div>

      {/* Match Information */}
      <div className="flex flex-col justify-between flex-1 p-3">
        <div>
          <h3 className="text-sm font-semibold text-white/90 line-clamp-2 leading-snug group-hover:text-white transition-colors duration-200">
            {match.name}
          </h3>
          {match.tag ? (
            <p className="mt-1 text-xs text-white/50 truncate font-medium">{match.tag}</p>
          ) : null}
        </div>

        {match.source_tag ? (
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/70">
            <span className="truncate">{match.source_tag}</span>
            {match.substreams && match.substreams.length > 0 ? (
              <span className="text-[10px] font-semibold text-accent-hi">
                +{match.substreams.length} server
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
