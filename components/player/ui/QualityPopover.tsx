import { useMemo, useState } from "react";
import type { PlaybackRate, QualityLabel, ServerGroup, ServerOption } from "../types";
import { FALLBACK_FLAG_URL, PLAYBACK_RATES, SERVER_GROUPS, getFlagUrl } from "../constants";

interface QualityPopoverProps {
  open: boolean;
  quality: QualityLabel | null;
  onQualityChange: (quality: QualityLabel | null) => void;
  servers?: ServerOption[];
  serverGroups?: ServerGroup[];
  activeServerId: string;
  pendingServerId?: string | null;
  failedServerIds?: Record<string, boolean>;
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

function cleanId(id: string): string {
  return id.replace(/^(vidy|vidking|vixsrc)-/, "");
}

function isServerActive(serverId: string, activeId: string, defaultFallbackId?: string): boolean {
  if (serverId === activeId) return true;
  if (activeId === "default" && defaultFallbackId && serverId === defaultFallbackId) return true;
  const cActive = cleanId(activeId);
  const cServer = cleanId(serverId);
  return cActive.length > 0 && cActive === cServer;
}

function isServerPending(serverId: string, pendingId?: string | null): boolean {
  if (!pendingId) return false;
  if (serverId === pendingId) return true;
  const cPending = cleanId(pendingId);
  const cServer = cleanId(serverId);
  return cPending.length > 0 && cPending === cServer;
}

function isServerFailed(serverId: string, failedIds: Record<string, boolean>): boolean {
  if (failedIds[serverId]) return true;
  const cServer = cleanId(serverId);
  if (failedIds[cServer]) return true;
  if (failedIds[`vidy-${cServer}`]) return true;
  if (failedIds[`vidking-${cServer}`]) return true;
  return false;
}

export function QualityPopover({
  open,
  quality,
  onQualityChange,
  serverGroups = SERVER_GROUPS,
  activeServerId,
  pendingServerId,
  failedServerIds = {},
  onServerChange,
  rate,
  onRateChange,
  resolvedLevel,
}: QualityPopoverProps) {
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Determine which group contains the active server to expand it by default
  const defaultActiveGroupId = useMemo(() => {
    if (!activeServerId) return serverGroups[0]?.id;
    for (const group of serverGroups) {
      if (group.id === activeServerId) return group.id;
      if (
        group.children.some((c) =>
          isServerActive(c.id, activeServerId, "vidy-miami")
        )
      ) {
        return group.id;
      }
    }
    return serverGroups[0]?.id;
  }, [serverGroups, activeServerId]);

  const isGroupExpanded = (groupId: string): boolean => {
    if (expandedGroups[groupId] !== undefined) {
      return expandedGroups[groupId];
    }
    return groupId === defaultActiveGroupId;
  };

  const toggleGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !isGroupExpanded(groupId),
    }));
  };

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
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1.5 pr-1">
                {serverGroups.map((group) => {
                  const hasChildren = group.children && group.children.length > 0;

                  // Standalone server (no children, e.g. Vixsrc)
                  if (!hasChildren) {
                    const isActive = isServerActive(group.id, activeServerId);
                    const isPending = isServerPending(group.id, pendingServerId);
                    const isFailed = isServerFailed(group.id, failedServerIds);
                    const isFav = !!favorites[group.id];

                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => onServerChange(group.id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] font-medium text-left transition-all duration-150 cursor-pointer ${
                          isActive
                            ? "bg-white/[0.08] border border-cyan-500/30 text-white shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                            : "text-gray-300 hover:text-white hover:bg-white/[0.04] border border-transparent"
                        }`}
                      >
                        {group.flagUrl ? (
                          <div className="flex h-4 w-5 flex-shrink-0 items-center justify-center rounded bg-black/40 p-0.5 border border-white/10 overflow-hidden shadow-inner">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getFlagUrl(group.flagUrl)}
                              alt=""
                              className="h-full w-full object-cover rounded-[1px]"
                              loading="eager"
                              decoding="sync"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = FALLBACK_FLAG_URL;
                              }}
                            />
                          </div>
                        ) : null}

                        <span className="flex-1 min-w-0 truncate font-medium">{group.name}</span>

                        {isPending ? (
                          <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-500/10 text-cyan-300">
                            <svg className="h-2.5 w-2.5 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          </div>
                        ) : isFailed ? (
                          <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-red-500/80 bg-red-500/20 text-red-400 animate-in fade-in duration-200">
                            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                        ) : isActive ? (
                          <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-cyan-400/80 bg-cyan-500/20 text-cyan-300">
                            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : null}

                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="Favorite server"
                          onClick={(e) => toggleFavorite(e, group.id)}
                          className={`p-1 -m-0.5 rounded-md transition-colors flex-shrink-0 cursor-pointer ${
                            isFav
                              ? "text-red-400 hover:bg-white/10"
                              : "text-gray-500 hover:text-red-400 hover:bg-white/10"
                          }`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill={isFav ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                          </svg>
                        </span>
                      </button>
                    );
                  }

                  // Group with children (e.g. Vidy, Vidking)
                  const isExpanded = isGroupExpanded(group.id);

                  // Pin active playing child to the top of its group
                  const activeChildIndex = group.children.findIndex((c) =>
                    isServerActive(c.id, activeServerId, "vidy-miami")
                  );
                  const sortedChildren =
                    activeChildIndex > 0
                      ? [
                          group.children[activeChildIndex],
                          ...group.children.filter((_, i) => i !== activeChildIndex),
                        ]
                      : group.children;

                  return (
                    <div key={group.id} className="flex flex-col">
                      {/* Accordion Header */}
                      <button
                        type="button"
                        onClick={(e) => toggleGroup(group.id, e)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors group select-none"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate tracking-wider uppercase text-[11px] font-bold text-gray-400 group-hover:text-gray-200">
                            {group.name}
                          </span>
                          <span className="text-[10px] font-normal text-gray-500">
                            ({group.children.length})
                          </span>
                        </div>

                        {/* Theme-consistent Chevron */}
                        <div className="flex items-center justify-center w-5 h-5 text-gray-400 group-hover:text-white transition-transform duration-150">
                          <svg
                            className={`w-3.5 h-3.5 transition-transform duration-150 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </div>
                      </button>

                      {/* Collapsible Children */}
                      {isExpanded ? (
                        <div className="mt-0.5 ml-2 pl-2 border-l border-white/10 space-y-0.5">
                          {sortedChildren.map((child) => {
                            const isActive = isServerActive(child.id, activeServerId, "vidy-miami");
                            const isPending = isServerPending(child.id, pendingServerId);
                            const isFailed = isServerFailed(child.id, failedServerIds);
                            const isFav = !!favorites[child.id];

                            return (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => onServerChange(child.id)}
                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium text-left transition-all duration-150 cursor-pointer ${
                                  isActive
                                    ? "bg-white/[0.08] border border-cyan-500/30 text-white shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                                    : "text-gray-300 hover:text-white hover:bg-white/[0.04] border border-transparent"
                                }`}
                              >
                                {child.flagUrl ? (
                                  <div className="flex h-4 w-5 flex-shrink-0 items-center justify-center rounded bg-black/40 p-0.5 border border-white/10 overflow-hidden shadow-inner">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={getFlagUrl(child.flagUrl)}
                                      alt=""
                                      className="h-full w-full object-cover rounded-[1px]"
                                      loading="eager"
                                      decoding="sync"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = FALLBACK_FLAG_URL;
                                      }}
                                    />
                                  </div>
                                ) : null}

                                <span className="flex-1 min-w-0 truncate">{child.name}</span>

                                {isPending ? (
                                  <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-500/10 text-cyan-300">
                                    <svg className="h-2.5 w-2.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                  </div>
                                ) : isFailed ? (
                                  <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-red-500/80 bg-red-500/20 text-red-400 animate-in fade-in duration-200">
                                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </div>
                                ) : isActive ? (
                                  <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-cyan-400/80 bg-cyan-500/20 text-cyan-300">
                                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                ) : null}

                                <span
                                  role="button"
                                  tabIndex={0}
                                  aria-label="Favorite server"
                                  onClick={(e) => toggleFavorite(e, child.id)}
                                  className={`p-1 -m-0.5 rounded-md transition-colors flex-shrink-0 cursor-pointer ${
                                    isFav
                                      ? "text-red-400 hover:bg-white/10"
                                      : "text-gray-500 hover:text-red-400 hover:bg-white/10"
                                  }`}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill={isFav ? "currentColor" : "none"}
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                                  </svg>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
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
