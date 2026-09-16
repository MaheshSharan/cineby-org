import { useMemo, useRef } from "react";
import Link from "next/link";
import type { SubtitleTrack } from "../types";
import { FALLBACK_FLAG_URL, getFlagUrl } from "../constants";

interface AudioSubtitlesPopoverProps {
  open: boolean;
  subtitleTracks: SubtitleTrack[];
  activeSubtitleId?: string | null;
  onSubtitleChange: (track: SubtitleTrack | null) => void;
  onUploadSubtitle?: (file: File) => void;
  onOpenOpenSubtitles?: () => void;
  subtitlesEnabled: boolean;
  isSubtitlesFetching: boolean;
  onToggleSubtitles: () => void;
}

export function AudioSubtitlesPopover({
  open,
  subtitleTracks,
  activeSubtitleId,
  onSubtitleChange,
  onUploadSubtitle,
  onOpenOpenSubtitles,
  subtitlesEnabled,
  isSubtitlesFetching,
  onToggleSubtitles,
}: AudioSubtitlesPopoverProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pin selected subtitle track to index 0 so it's always at the top without scrolling
  const orderedSubtitleTracks = useMemo(() => {
    if (!activeSubtitleId || subtitleTracks.length <= 1) {
      return subtitleTracks;
    }
    const activeIndex = subtitleTracks.findIndex(
      (t) => t.id === activeSubtitleId || t.lang === activeSubtitleId
    );
    if (activeIndex <= 0) return subtitleTracks;
    const activeTrack = subtitleTracks[activeIndex];
    return [activeTrack, ...subtitleTracks.filter((_, i) => i !== activeIndex)];
  }, [subtitleTracks, activeSubtitleId]);

  if (!open) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onUploadSubtitle) {
      onUploadSubtitle(file);
    }
  };

  return (
    <div
      data-player-ui
      className={`fixed left-1/2 top-[76px] z-50 -translate-x-1/2 w-[calc(100vw-1rem)] max-w-[min(480px,calc(100vw-1rem))] md:w-auto md:absolute md:left-auto md:right-0 md:top-full md:max-w-none md:translate-x-0 md:pt-2 transition-opacity duration-150 origin-top md:origin-top-right will-change-[opacity] ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="player-surface rounded-xl p-3 sm:p-4 shadow-2xl overflow-x-hidden">
        <div className="flex flex-col text-white">
            <div className="flex divide-x divide-white/10 max-h-[min(360px,50vh)]">
              {/* AUDIO COLUMN */}
              <div className="w-1/2 min-w-0 flex-1 md:w-auto md:min-w-[170px] md:max-w-[240px] flex flex-col min-h-0 pr-2.5 sm:pr-4">
                <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500 flex-shrink-0">
                  Audio
                </p>
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-0.5 pr-1">
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-left transition-colors text-white bg-white/[0.14]"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">Default Audio</span>
                    </span>
                  </button>
                </div>
              </div>

              {/* SUBTITLES COLUMN */}
              <div className="w-1/2 min-w-0 flex-1 md:w-auto md:min-w-[170px] md:max-w-[240px] flex flex-col min-h-0 pl-2.5 sm:pl-4">
                <div className="flex items-center justify-between px-2 pb-2.5 flex-shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                    Subtitles
                  </span>
                  {/* Subtitle On/Off Switch Toggle */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={subtitlesEnabled}
                    aria-label="Toggle subtitles"
                    onClick={onToggleSubtitles}
                    className={`group relative h-4 w-7 shrink-0 rounded-full border transition-all duration-200 cursor-pointer focus:outline-none ${
                      subtitlesEnabled
                        ? "bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.25)]"
                        : "bg-white/[0.06] border-white/[0.1] hover:border-white/20"
                    }`}
                  >
                    <span
                      className={`absolute top-[1.5px] h-2.5 w-2.5 rounded-full transition-all duration-200 shadow-sm ${
                        subtitlesEnabled
                          ? "left-[14px] bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]"
                          : "left-[2px] bg-white/40 group-hover:bg-white/60"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1.5 pr-1">
                  {/* Subtitle Tracks */}
                  {!subtitlesEnabled ? (
                    <div className="flex items-center justify-center px-3 py-4">
                      <p className="text-center text-[12px] leading-relaxed text-gray-400">
                        Enable to Search
                      </p>
                    </div>
                  ) : isSubtitlesFetching ? (
                    <div className="flex items-center justify-center px-3 py-6">
                      <svg
                        className="h-5 w-5 animate-spin text-cyan-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-label="Loading subtitles"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    </div>
                  ) : orderedSubtitleTracks.length === 0 ? (
                    <div className="flex items-center justify-center px-3 py-4">
                      <p className="text-center text-[12px] leading-relaxed text-gray-400">
                        No subtitles available
                      </p>
                    </div>
                  ) : (
                    orderedSubtitleTracks.map((track) => {
                      const isActive =
                        activeSubtitleId === track.id || activeSubtitleId === track.lang;

                      return (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => onSubtitleChange(track)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                            isActive
                              ? "bg-white/[0.08] border border-cyan-500/30 text-white shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                              : "text-gray-300 hover:text-white hover:bg-white/[0.04] border border-transparent"
                          }`}
                        >
                          {/* Flag Icon Container */}
                          <div className="flex h-7 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-black/40 p-0.5 border border-white/10 overflow-hidden shadow-inner">
                            {track.flagUrl || track.lang ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getFlagUrl(track.flagUrl || track.lang)}
                                alt=""
                                className="h-full w-full object-cover rounded-[4px]"
                                loading="eager"
                                decoding="sync"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = FALLBACK_FLAG_URL;
                                }}
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-white/50 uppercase">
                                {track.lang?.slice(0, 2) || "CC"}
                              </span>
                            )}
                          </div>

                          {/* Language Name & Lang code */}
                          <div className="flex-1 min-w-0">
                            <span className="block truncate text-[13px] font-medium text-white leading-tight">
                              {track.label || track.lang}
                            </span>
                            <span className="block text-[11px] text-gray-400 font-normal lowercase leading-tight mt-0.5">
                              {track.lang || "en"}
                            </span>
                          </div>

                          {/* Selected Checkmark Badge */}
                          {isActive && (
                            <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-cyan-400/80 bg-cyan-500/20 text-cyan-300">
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}

                  {/* Upload Subtitles Button */}
                  <div className="group relative mt-1 flex cursor-pointer select-none items-center gap-x-2 rounded-lg border border-dashed border-white/[0.12] bg-white/[0.01] px-3 py-2 text-[12.5px] font-medium text-gray-300 transition-colors duration-200 hover:border-white/[0.3] hover:bg-white/[0.04] hover:text-white">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".vtt,.srt"
                      className="absolute inset-0 z-10 opacity-0 cursor-pointer"
                      onChange={handleFileChange}
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="h-3.5 w-3.5 flex-shrink-0 text-white/40 transition-colors group-hover:text-white/80"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                    <div className="min-w-0 flex-1 truncate">Upload subtitles</div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM SECTION */}
            <div className="mt-3 pt-3 border-t border-white/10 space-y-0.5">
              <button
                type="button"
                onClick={onOpenOpenSubtitles}
                className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
              >
                <span className="flex items-center gap-2.5 whitespace-nowrap">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-search w-4 h-4 text-gray-400 flex-shrink-0"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  Search on OpenSubtitles
                </span>
                <svg
                  width="1.5em"
                  height="1.5em"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3.5 h-3.5 text-gray-500 flex-shrink-0"
                  aria-hidden="true"
                >
                  <path d="M9 6L15 12L9 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <Link
                href="/settings?tab=subtitles"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
              >
                <span className="flex items-center gap-2.5 whitespace-nowrap">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-settings2 w-4 h-4 text-gray-400 flex-shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M20 7h-9" />
                    <path d="M14 17H5" />
                    <circle cx="17" cy="17" r="3" />
                    <circle cx="7" cy="7" r="3" />
                  </svg>
                  Subtitle settings
                </span>
                <svg
                  width="1.5em"
                  height="1.5em"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3.5 h-3.5 text-gray-500 flex-shrink-0"
                  aria-hidden="true"
                >
                  <path d="M9 6L15 12L9 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
      </div>
    </div>
  );
}
