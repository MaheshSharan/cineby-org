import Link from "next/link";
import * as Select from "@radix-ui/react-select";
import { useEffect, useMemo, useState } from "react";

import type { Episode, Season, SeasonEpisodes } from "@/lib/tmdb";
import { getSeasonEpisodes } from "@/lib/api/episodes";
import { getSeasonPosterThumbUrl, getStillThumbUrl } from "@/lib/tmdb/image";
import { getEpisodeHref } from "@/lib/utils/media";
import { useSettings } from "@/hooks/useSettings";

import { ContentRow } from "@/components/content/ContentRow";
import { DownloadIcon } from "@/components/ui/icons";

interface EpisodesSectionProps {
  tvId: number;
  seasons: Season[];
  onReady?: () => void;
}

const CONTROL_SURFACE_STYLE = {
  background:
    "linear-gradient(rgba(255, 255, 255, 0.035) 0%, rgba(255, 255, 255, 0.01) 100%)",
  boxShadow:
    "rgba(255, 255, 255, 0.05) 0px 1px 0px inset, rgba(0, 0, 0, 0.55) 0px 6px 14px -6px",
} as const;

export function EpisodesSection({ tvId, seasons, onReady }: EpisodesSectionProps) {
  const { settings } = useSettings();
  const episodeViewStyle = settings.appearance.episodeViewStyle;

  const defaultSeason =
    seasons.find((season) => season.seasonNumber > 0) ?? seasons[0];

  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(
    defaultSeason?.seasonNumber ?? 0
  );
  const [episodes, setEpisodes] = useState<SeasonEpisodes | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [query, setQuery] = useState("");
  const [sortDescending, setSortDescending] = useState(false);
  const [expandedEpisodeId, setExpandedEpisodeId] = useState<number | null>(
    null
  );

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);

    let isCurrent = true;

    getSeasonEpisodes(tvId, selectedSeasonNumber)
      .then((data) => {
        if (isCurrent) {
          setEpisodes(data);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setEpisodes(null);
          setHasError(true);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
        onReady?.();
      });

    return () => {
      isCurrent = false;
    };
  }, [tvId, selectedSeasonNumber, onReady]);

  const visibleEpisodes = useMemo<Episode[]>(() => {
    if (!episodes) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? episodes.episodes.filter(
          (episode) =>
            episode.name.toLowerCase().includes(normalizedQuery) ||
            episode.overview.toLowerCase().includes(normalizedQuery)
        )
      : episodes.episodes;

    return [...filtered].sort((a, b) =>
      sortDescending
        ? b.episodeNumber - a.episodeNumber
        : a.episodeNumber - b.episodeNumber
    );
  }, [episodes, query, sortDescending]);

  const selectedSeason =
    seasons.find((season) => season.seasonNumber === selectedSeasonNumber) ??
    null;

  return (
    <section id="episodes-section" className="mt-16">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="heading-trail min-w-0 truncate text-xl font-semibold text-text-hi md:text-2xl">
          Episodes
        </h2>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Select.Root
          value={String(selectedSeasonNumber)}
          onValueChange={(value) => setSelectedSeasonNumber(Number(value))}
        >
          <Select.Trigger
            className="flex h-9 min-w-[140px] items-center justify-between gap-2.5 rounded-[12px] border border-white/[0.08] bg-white/[0.04] px-3.5 text-[12.5px] font-medium text-text-hi backdrop-blur-md transition-all hover:border-primary/30 hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background data-[state=open]:border-primary/40"
            aria-label="Select season"
          >
            <span className="line-clamp-1 font-medium">
              {selectedSeason?.name ?? `Season ${selectedSeasonNumber}`}
            </span>
            <Select.Icon className="ml-1 flex items-center">
              <svg
                className="h-3.5 w-3.5 text-white/50 transition-transform duration-200 group-data-[state=open]:rotate-180"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </Select.Icon>
          </Select.Trigger>

          <Select.Portal>
            <Select.Content
              position="popper"
              sideOffset={6}
              className="relative z-50 w-72 max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-[#16181d]/95 p-1.5 text-text-hi shadow-2xl backdrop-blur-xl animate-in fade-in-50 zoom-in-95 duration-100"
            >
              <Select.Viewport className="p-0.5">
                {seasons.map((season) => {
                  const posterUrl = getSeasonPosterThumbUrl(season.posterPath);
                  const isSelected = season.seasonNumber === selectedSeasonNumber;
                  return (
                    <Select.Item
                      key={season.id}
                      value={String(season.seasonNumber)}
                      className={`relative my-1 flex w-full cursor-pointer select-none items-center gap-3 rounded-lg p-2 text-left outline-none transition-colors data-[highlighted]:bg-white/10 ${
                        isSelected ? "bg-white/10 ring-1 ring-white/15" : "hover:bg-white/5"
                      }`}
                    >
                      <span className="shrink-0 w-9 h-[54px] rounded-md overflow-hidden bg-white/[0.06] border border-white/10 flex items-center justify-center">
                        {posterUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={posterUrl}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-semibold text-white/40">
                            S{season.seasonNumber}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <Select.ItemText asChild>
                          <span
                            className={`block text-sm font-medium truncate ${
                              isSelected ? "text-white" : "text-white/85"
                            }`}
                          >
                            {season.name}
                          </span>
                        </Select.ItemText>
                        <span className="block text-xs text-white/45 mt-0.5">
                          {season.episodeCount} {season.episodeCount === 1 ? "episode" : "episodes"}
                        </span>
                      </span>
                    </Select.Item>
                  );
                })}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>

        <div className="relative min-w-[180px] max-w-xs flex-1">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-mid"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search episode…"
            aria-label="Search episodes"
            className="h-9 w-full rounded-[12px] border border-white/[0.07] pl-9 pr-3 text-[12.5px] font-medium text-text-hi outline-none transition-colors placeholder:text-text-mid focus:border-primary/40"
            style={CONTROL_SURFACE_STYLE}
          />
        </div>

        <button
          type="button"
          title={sortDescending ? "Sort A-Z" : "Sort Z-A"}
          aria-label="Toggle episode sort order"
          onClick={() => setSortDescending((descending) => !descending)}
          className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/[0.07] text-text-mid transition-colors hover:border-primary/30 hover:text-primary"
          style={CONTROL_SURFACE_STYLE}
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 transition-transform duration-200 ${
              sortDescending ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m3 16 4 4 4-4" />
            <path d="M7 20V4" />
            <path d="M20 8h-5" />
            <path d="M15 10V6.5a2.5 2.5 0 0 1 5 0V10" />
            <path d="M15 14h5l-5 6h5" />
          </svg>
        </button>
      </div>

      {isLoading ? (
        episodeViewStyle === "carousel" ? (
          <div className="flex gap-4 overflow-hidden py-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="w-72 md:w-80 flex-none space-y-3">
                <div className="aspect-video w-full animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
                <div className="space-y-1.5 px-1">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-white/[0.04]" />
                  <div className="h-3 w-full animate-pulse rounded bg-white/[0.02]" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex max-h-[32rem] flex-col gap-2 overflow-hidden pr-1 lg:max-h-[40rem]">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-[72px] animate-pulse rounded-[14px] border border-white/[0.06] bg-white/[0.02] md:h-[104px]"
              />
            ))}
          </div>
        )
      ) : hasError ? (
        <p className="text-[13px] text-text-mid">Unable to load episodes.</p>
      ) : visibleEpisodes.length === 0 ? (
        <p className="text-[13px] text-text-mid">No episodes found.</p>
      ) : episodeViewStyle === "carousel" ? (
        <ContentRow
          className="relative -mx-1 px-1"
          scrollerClassName="gap-4 pb-4 pt-1"
        >
          {visibleEpisodes.map((episode) => (
            <EpisodeCarouselCard
              key={episode.id}
              tvId={tvId}
              episode={episode}
            />
          ))}
        </ContentRow>
      ) : (
        <div className="scrollbar-styles flex max-h-[32rem] flex-col gap-2 overflow-auto pr-1 lg:max-h-[40rem]">
          {visibleEpisodes.map((episode) => (
            <EpisodeCard
              key={episode.id}
              tvId={tvId}
              episode={episode}
              isExpanded={expandedEpisodeId === episode.id}
              onToggleExpand={() =>
                setExpandedEpisodeId((id) =>
                  id === episode.id ? null : episode.id
                )
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface EpisodeCardProps {
  tvId: number;
  episode: Episode;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function EpisodeCard({
  tvId,
  episode,
  isExpanded,
  onToggleExpand,
}: EpisodeCardProps) {
  const still = getStillThumbUrl(episode.stillPath);
  const playHref = getEpisodeHref(
    tvId,
    episode.seasonNumber,
    episode.episodeNumber
  );

  return (
    <div className="group relative w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md transition-all duration-300 hover:border-primary/50 hover:bg-white/[0.06] hover:shadow-[0_0_24px_var(--primary-glow)]">
      <div className="flex cursor-pointer items-center gap-3 p-2.5 md:cursor-default md:gap-5 md:p-3.5">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 items-center gap-3 md:hidden text-left"
          aria-expanded={isExpanded}
        >
          <div className="relative aspect-video w-28 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40">
            {still ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={still}
                alt=""
                title={episode.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : null}
            <span className="absolute top-1.5 left-1.5 rounded-full border border-white/15 bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
              E{episode.episodeNumber}
            </span>
            {episode.runtime ? (
              <span className="absolute bottom-1.5 right-1.5 rounded-full border border-white/15 bg-black/60 px-1.5 py-0.5 text-[9.5px] font-medium text-white/90 backdrop-blur-md">
                {episode.runtime}m
              </span>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h4 className="line-clamp-1 text-[14px] font-medium leading-snug text-text-hi">
              {episode.name}
            </h4>
          </div>
          <svg
            className={`h-4 w-4 flex-shrink-0 text-text-mid transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <Link
          href={playHref}
          className="hidden min-w-0 flex-1 items-center gap-5 md:flex"
        >
          <div className="relative aspect-video w-48 md:w-56 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-md">
            {still ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={still}
                alt=""
                title={episode.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/[0.03] text-text-mid text-xs">
                No preview available
              </div>
            )}

            {/* Episode Badge top-left */}
            <span className="absolute top-2 left-2 rounded-full border border-white/15 bg-black/60 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md">
              E{episode.episodeNumber}
            </span>

            {/* Duration Badge bottom-right */}
            {episode.runtime ? (
              <span className="absolute bottom-2 right-2 rounded-full border border-white/15 bg-black/60 px-2 py-0.5 text-[10.5px] font-medium text-white/90 backdrop-blur-md">
                {episode.runtime}m
              </span>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1">
            <h4 className="line-clamp-1 text-base font-semibold leading-snug text-text-hi transition-colors duration-200 group-hover:text-primary">
              {episode.name}
            </h4>
            <p className="line-clamp-2 text-[13px] leading-relaxed text-text-mid">
              {episode.overview || "No overview available."}
            </p>
          </div>
        </Link>

        <div className="hidden flex-shrink-0 items-center md:flex pr-1">
          <button
            type="button"
            aria-label={`Download ${episode.name}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-text-mid transition-all duration-200 hover:border-primary/40 hover:bg-white/[0.08] hover:text-primary"
          >
            <DownloadIcon size={15} />
          </button>
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-out md:hidden ${
          isExpanded ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-3.5 pb-3.5 pt-1 border-t border-white/[0.06]">
          <h4 className="mb-2 text-[15px] font-medium leading-snug text-text-hi">
            <span className="tabular-nums font-semibold">{episode.episodeNumber}.</span>{" "}
            {episode.name}
          </h4>
          <p className="scrollbar-styles mb-3 max-h-[140px] overflow-y-auto pr-1 text-[13px] leading-relaxed text-text-mid">
            {episode.overview || "No overview available."}
          </p>
          <div className="flex items-center gap-2.5">
            <Link
              href={playHref}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[12px] font-semibold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all hover:brightness-110 active:scale-95"
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="currentColor"
                aria-hidden="true"
              >
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
              Play
            </Link>
            <button
              type="button"
              aria-label={`Download ${episode.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-text-mid transition-colors duration-200 hover:border-primary/40 hover:text-primary"
            >
              <DownloadIcon size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EpisodeCarouselCardProps {
  tvId: number;
  episode: Episode;
}

function EpisodeCarouselCard({ tvId, episode }: EpisodeCarouselCardProps) {
  const still = getStillThumbUrl(episode.stillPath);
  const playHref = getEpisodeHref(
    tvId,
    episode.seasonNumber,
    episode.episodeNumber
  );

  return (
    <Link
      href={playHref}
      className="group/epcard flex w-72 md:w-80 flex-none flex-col gap-3 cursor-pointer transition-transform duration-200 active:scale-[0.98]"
    >
      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 transition-all duration-300 group-hover/epcard:scale-[1.03] group-hover/epcard:border-primary/50 group-hover/epcard:ring-1 group-hover/epcard:ring-primary/40 group-hover/epcard:shadow-[0_0_24px_var(--primary-glow)]">
        {still ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={still}
            alt=""
            title={episode.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-all duration-500 group-hover/epcard:brightness-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/[0.03] text-text-mid text-xs">
            No preview available
          </div>
        )}

        {/* Episode badge top left */}
        <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white">
          E{episode.episodeNumber}
        </div>

        {/* Duration badge bottom right */}
        {episode.runtime ? (
          <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-medium text-white/90">
            {episode.runtime}m
          </div>
        ) : null}
      </div>

      <div className="space-y-1 px-1">
        <h3 className="line-clamp-1 text-[15px] font-semibold text-text-hi transition-colors duration-200 group-hover/epcard:text-primary">
          {episode.name}
        </h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-text-mid">
          {episode.overview || "No overview available."}
        </p>
      </div>
    </Link>
  );
}