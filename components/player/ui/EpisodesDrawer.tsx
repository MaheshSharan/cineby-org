import React, { useCallback, useRef, useState } from "react";
import type { Episode } from "../types";
import { formatRuntime } from "@/lib/utils/media";

interface SeasonOption {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  overview: string;
}

interface EpisodesDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  seasons: SeasonOption[];
  episodes: Episode[];
  selectedSeason: number;
  onSeasonChange: (seasonNumber: number) => void;
  onEpisodeSelect: (episode: Episode) => void;
  activeEpisodeNumber?: number;
  activeSeasonNumber?: number;
  isLoading?: boolean;
  autoNext: boolean;
  onToggleAutoNext: () => void;
}

export const EpisodesDrawer = React.memo(function EpisodesDrawer({
  open,
  onClose,
  title,
  seasons,
  episodes,
  selectedSeason,
  onSeasonChange,
  onEpisodeSelect,
  activeEpisodeNumber,
  activeSeasonNumber,
  isLoading = false,
  autoNext,
  onToggleAutoNext,
}: EpisodesDrawerProps) {
  const [query] = useState("");
  const hasScrolledRef = useRef(false);

  const activeEpisodeRef = useCallback((node: HTMLDivElement | null) => {
    if (node && !hasScrolledRef.current) {
      hasScrolledRef.current = true;
      requestAnimationFrame(() => {
        node.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
  }, []);

  if (!open) {
    // Reset scroll tracking when drawer closes so it re-scrolls on next open
    hasScrolledRef.current = false;
    return null;
  }

  const filteredEpisodes = query.trim()
    ? episodes.filter((ep) =>
        ep.name.toLowerCase().includes(query.trim().toLowerCase()) ||
        ep.episodeNumber.toString().includes(query.trim())
      )
    : episodes;

  return (
    <div
      data-player-ui
      className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-2xl flex flex-col p-4 sm:p-6 md:p-10 text-white overflow-hidden"
      role="dialog"
      aria-label="Episodes"
    >
      {/* MODAL HEADER */}
      <div className="flex items-center justify-between flex-shrink-0 border-b border-white/10 pb-3 sm:pb-5 gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white truncate">
            Episodes
          </h2>
          <p className="text-xs sm:text-sm font-medium text-gray-400 mt-0.5 truncate">
            {title}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Auto Next Toggle */}
          <button
            type="button"
            onClick={onToggleAutoNext}
            className="flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] transition-colors cursor-pointer"
          >
            <svg
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[11px] sm:text-xs font-semibold text-gray-200 whitespace-nowrap">Auto next</span>
            <div
              className={`w-6 sm:w-7 h-3.5 sm:h-4 flex items-center rounded-full p-0.5 transition-colors flex-shrink-0 ${
                autoNext ? "bg-white" : "bg-white/20"
              }`}
            >
              <div
                className={`bg-black w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full shadow-md transform transition-transform ${
                  autoNext ? "translate-x-2.5 sm:translate-x-3" : "translate-x-0"
                }`}
              />
            </div>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* MODAL BODY */}
      <div className="flex flex-col mt-4 md:mt-6 flex-1 min-h-0 gap-4">
        {/* SEASON SELECTOR DROPDOWN */}
        {seasons.length > 0 ? (
          <div className="flex-shrink-0 flex items-center gap-3">
            <label htmlFor="season-select" className="text-xs md:text-sm font-semibold text-gray-300">
              Season:
            </label>
            <div className="relative flex-1 max-w-xs sm:max-w-sm">
              <select
                id="season-select"
                value={selectedSeason}
                onChange={(e) => onSeasonChange(Number(e.target.value))}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.08] hover:bg-white/[0.12] text-white px-4 py-2.5 pr-10 text-sm font-semibold transition-all focus:outline-none focus:border-white/30 cursor-pointer"
              >
                {seasons.map((season) => (
                  <option
                    key={season.seasonNumber}
                    value={season.seasonNumber}
                    className="bg-[#18181b] text-white py-1"
                  >
                    {season.name || `Season ${season.seasonNumber}`} ({season.episodeCount} Episodes)
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        ) : null}

        {/* EPISODES LIST */}
        <div className="flex flex-col gap-3 overflow-y-auto pr-1 md:pr-2 no-scrollbar min-h-0 flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
              Loading episodes...
            </div>
          ) : filteredEpisodes.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
              No episodes found.
            </div>
          ) : (
            filteredEpisodes.map((episode) => {
              const isCurrentPlaying =
                selectedSeason === activeSeasonNumber &&
                episode.episodeNumber === activeEpisodeNumber;

              const runtimeStr = episode.runtime ? formatRuntime(episode.runtime) : "";

              return (
                <div
                  ref={isCurrentPlaying ? activeEpisodeRef : undefined}
                  key={episode.id}
                  onClick={() => onEpisodeSelect(episode)}
                  className={`flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer group text-left w-full ${
                    isCurrentPlaying
                      ? "border-white/30 bg-white/[0.08]"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative w-full sm:w-48 h-36 sm:h-28 flex-shrink-0 rounded-xl overflow-hidden bg-white/5">
                    {episode.stillPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://image.tmdb.org/t/p/w500${episode.stillPath}`}
                        alt={episode.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors truncate">
                        {episode.name}
                      </h3>
                      {isCurrentPlaying ? (
                        <span className="bg-white text-black text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm flex-shrink-0">
                          Now Playing
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs text-gray-400 font-medium mt-1">
                      S{episode.seasonNumber} E{episode.episodeNumber}
                      {runtimeStr ? ` · ${runtimeStr}` : ""}
                    </p>

                    {episode.overview ? (
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mt-2">
                        {episode.overview}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
});
