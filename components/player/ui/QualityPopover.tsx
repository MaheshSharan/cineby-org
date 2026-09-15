import { useMemo, useState } from "react";
import type { PlaybackRate, QualityLabel, ServerOption } from "../types";
import { PLAYBACK_RATES } from "../constants";

interface QualityPopoverProps {
  open: boolean;
  quality: QualityLabel | null;
  onQualityChange: (quality: QualityLabel | null) => void;
  servers: ServerOption[];
  activeServerId: string;
  onServerChange: (serverId: string) => void;
  rate: PlaybackRate;
  onRateChange: (rate: PlaybackRate) => void;
  resolvedLevel?: string | null;
}

const QUALITY_OPTIONS: { value: QualityLabel | null; label: string; badge?: string }[] = [
  { value: null, label: "Auto" },
  { value: "2160p", label: "2160p" },
  { value: "1080p", label: "1080p", badge: "Full HD" },
  { value: "720p", label: "720p", badge: "HD" },
  { value: "480p", label: "480p" },
];

export function QualityPopover({
  open,
  quality,
  onQualityChange,
  servers,
  activeServerId,
  onServerChange,
  rate,
  onRateChange,
  resolvedLevel,
}: QualityPopoverProps) {
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Pin active playing server to index 0 so it's always at the top without scrolling
  const orderedServers = useMemo(() => {
    if (!activeServerId || servers.length <= 1) {
      return servers;
    }
    const cleanActiveId = activeServerId.replace(/^vidy-/, "");
    const activeIndex = servers.findIndex(
      (s) =>
        s.id === activeServerId ||
        s.id === cleanActiveId ||
        s.id === `vidy-${cleanActiveId}`
    );
    if (activeIndex <= 0) return servers;
    const activeServer = servers[activeIndex];
    return [activeServer, ...servers.filter((_, i) => i !== activeIndex)];
  }, [servers, activeServerId]);

  const toggleFavorite = (e: React.MouseEvent, serverId: string) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [serverId]: !prev[serverId] }));
  };

  return (
    <div
      data-player-ui
      className={`fixed left-1/2 top-[76px] z-50 -translate-x-1/2 w-[calc(100vw-1rem)] max-w-[min(480px,calc(100vw-1rem))] md:w-auto md:absolute md:left-auto md:right-0 md:top-full md:max-w-none md:translate-x-0 md:pt-2 transition-opacity duration-150 origin-top md:origin-top-right will-change-[opacity] ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="player-surface rounded-xl p-3 sm:p-4 shadow-2xl overflow-x-hidden">
        <div className="flex flex-col">
          {/* TWO COLUMN SECTION: Quality (Left) & Server (Right) */}
          <div className="flex divide-x divide-white/10 max-h-[min(420px,58vh)]">
            {/* QUALITY COLUMN */}
            <div className="w-1/2 min-w-0 flex-1 md:w-auto md:min-w-[170px] md:max-w-[240px] flex flex-col min-h-0 pr-2.5 sm:pr-4">
              <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500 flex-shrink-0">
                Quality
              </p>
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-0.5 pr-1">
                {QUALITY_OPTIONS.map((q) => {
                  const isActive = quality === q.value;
                  const isAuto = q.value === null;

                  return (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => onQualityChange(q.value)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-left transition-colors ${
                        isActive
                          ? "text-white bg-white/[0.14]"
                          : "text-gray-300 hover:text-white hover:bg-white/[0.08]"
                      }`}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-1.5 truncate">
                          <span>{q.label}</span>
                          {isAuto && resolvedLevel ? (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/10 text-cyan-400">
                              {resolvedLevel}
                            </span>
                          ) : null}
                        </span>
                        {q.badge ? (
                          <span className="block text-[11px] font-normal text-gray-500 mt-0.5 truncate">
                            {q.badge}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SERVER COLUMN */}
            <div className="w-1/2 min-w-0 flex-1 md:w-auto md:min-w-[170px] md:max-w-[240px] flex flex-col min-h-0 pl-2.5 sm:pl-4">
              <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500 flex-shrink-0">
                Server
              </p>
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-0.5 pr-1">
                {orderedServers.map((server) => {
                  const cleanActiveId = activeServerId.replace(/^vidy-/, "");
                  const cleanServerId = server.id.replace(/^vidy-/, "");
                  const isActive =
                    activeServerId === server.id ||
                    (cleanActiveId && cleanActiveId === cleanServerId);
                  const isFav = !!favorites[server.id];

                  return (
                    <button
                      key={server.id}
                      type="button"
                      onClick={() => onServerChange(server.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-left transition-all duration-150 cursor-pointer ${
                        isActive
                          ? "bg-white/[0.08] border border-cyan-500/30 text-white shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                          : "text-gray-300 hover:text-white hover:bg-white/[0.04] border border-transparent"
                      }`}
                    >
                      {/* Flag Icon Container */}
                      {server.flagUrl ? (
                        <div className="flex h-5 w-6 flex-shrink-0 items-center justify-center rounded bg-black/40 p-0.5 border border-white/10 overflow-hidden shadow-inner">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={server.flagUrl}
                            alt=""
                            className="h-full w-full object-cover rounded-[2px]"
                            loading="eager"
                            decoding="sync"
                          />
                        </div>
                      ) : null}

                      <span className="flex-1 min-w-0">
                        <span className="block truncate">{server.name}</span>
                        {server.description && !isActive ? (
                          <span className="block text-[11px] font-normal text-gray-500 mt-0.5 truncate">
                            {server.description}
                          </span>
                        ) : null}
                      </span>

                      {/* Active Server Checkmark Badge matching subtitle selection */}
                      {isActive && (
                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-cyan-400/80 bg-cyan-500/20 text-cyan-300">
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}

                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Favorite server"
                        onClick={(e) => toggleFavorite(e, server.id)}
                        className={`p-1 -m-0.5 rounded-md transition-colors flex-shrink-0 cursor-pointer ${
                          isFav
                            ? "text-red-400 hover:bg-white/10"
                            : "text-gray-500 hover:text-red-400 hover:bg-white/10"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill={isFav ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-heart"
                          aria-hidden="true"
                        >
                          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                        </svg>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Speed */}
          <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
            <span className="px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500 flex-shrink-0">
              Speed
            </span>
            <div className="flex flex-1 items-center gap-1">
              {PLAYBACK_RATES.map((r) => {
                const isActive = rate === r;

                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onRateChange(r)}
                    className={`flex-1 rounded-full px-1.5 py-1.5 text-[11.5px] font-semibold tabular-nums transition-colors ${
                      isActive
                        ? "bg-white text-black"
                        : "text-gray-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {r}x
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
