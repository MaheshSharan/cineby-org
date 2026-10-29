import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { buildImageUrl } from "@/lib/tmdb/image";
import { trackEvent } from "@/lib/analytics/gtag";

import type { PlayerMedia } from "./types";
import { ONBOARD_ADS_PLAYER_INFO_KEY } from "./types";
import { ServerDrawer } from "./ui/ServerDrawer";
import { AdBlockModal } from "./ui/AdBlockModal";
import { useEmbedBridge } from "./hooks/useEmbedBridge";
import { getEmbedProvider } from "@/lib/embeds/registry";
import type { PlayerServerOption } from "@/lib/player/modeConfig";

export { ONBOARD_ADS_PLAYER_INFO_KEY };

interface EmbedPlayerProps {
  media: PlayerMedia;
  subtitle?: string;
  servers: PlayerServerOption[];
  currentServerId: string;
  loadTimeoutMs: number;
  initialTime?: number;
  onBack?: () => void;
  onSelectServer: (serverId: string) => void;
  onTimeUpdate?: (currentTime: number, duration: number, playback?: { seasonNumber?: number; episodeNumber?: number }) => void;
  onEnded?: () => void;
  onNavigateEpisode?: (seasonNumber: number, episodeNumber: number) => void;
}

export function EmbedPlayer({
  media,
  servers,
  currentServerId,
  loadTimeoutMs,
  initialTime = 0,
  onSelectServer,
  onTimeUpdate,
  onEnded,
  onNavigateEpisode,
}: EmbedPlayerProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAdBlockModalOpen, setIsAdBlockModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const startedRef = useRef(false);
  const reachedMilestonesRef = useRef<Set<number>>(new Set());

  // First-run AdBlock Onboarding Modal check
  useEffect(() => {
    try {
      const hasSeenOnboarding = localStorage.getItem(ONBOARD_ADS_PLAYER_INFO_KEY);
      if (!hasSeenOnboarding) {
        setIsAdBlockModalOpen(true);
        localStorage.setItem(ONBOARD_ADS_PLAYER_INFO_KEY, "true");
      }
    } catch {
      // Ignore localStorage availability issues in private/restricted modes
    }
  }, []);

  const provider = useMemo(() => getEmbedProvider(currentServerId), [currentServerId]);

  // Reset tracking state on media or server change
  useEffect(() => {
    startedRef.current = false;
    reachedMilestonesRef.current.clear();
  }, [media.mediaId, media.seasonNumber, media.episodeNumber, currentServerId]);

  // Immediately terminate previous server stream on server change, media change, or unmount
  useEffect(() => {
    const currentIframe = iframeRef.current;
    return () => {
      if (currentIframe) {
        try {
          currentIframe.src = "about:blank";
        } catch {}
      }
    };
  }, [currentServerId, media.mediaId, media.seasonNumber, media.episodeNumber]);

  // Intercept window.open on top window to block rogue third-party popups (allowing only authorized URLs like AdGuard)
  useEffect(() => {
    const originalOpen = window.open;
    window.open = function (url?: string | URL, target?: string, features?: string) {
      const targetUrl = typeof url === "string" ? url : url instanceof URL ? url.href : "";
      if (targetUrl && targetUrl.startsWith("https://chromewebstore.google.com/detail/adguard-adblocker")) {
        return originalOpen.call(window, url, target, features);
      }
      console.warn("[Cineby] Blocked unauthorized popup window attempt:", targetUrl);
      return null;
    };
    return () => {
      window.open = originalOpen;
    };
  }, []);

  const handleServerSelect = useCallback(
    (serverId: string) => {
      if (serverId === currentServerId) {
        setIsDrawerOpen(false);
        return;
      }
      if (iframeRef.current) {
        try {
          iframeRef.current.src = "about:blank";
        } catch {}
      }
      setIsLoaded(false);
      onSelectServer(serverId);
    },
    [currentServerId, onSelectServer]
  );

  // Construct iframe URL
  const embedUrl = useMemo(() => {
    if (!provider) return "";
    try {
      const isAnime = Boolean(media.anilistId);
      const effectiveType = isAnime ? "anime" : media.mediaType;
      const resumeSec =
        initialTime > 0
          ? initialTime
          : media.progressSeconds && media.progressSeconds > 0
          ? media.progressSeconds
          : undefined;

      return provider.buildUrl({
        type: effectiveType,
        tmdbId: media.mediaId,
        imdbId: media.imdbId ?? undefined,
        anilistId: media.anilistId ?? undefined,
        season: media.seasonNumber && media.seasonNumber > 0 ? media.seasonNumber : 1,
        episode: media.episodeNumber && media.episodeNumber > 0 ? media.episodeNumber : 1,
        startAtSec: resumeSec,
        progress: resumeSec,
        autoplay: true,
        theme: {
          primary: "DC2626",
          secondary: "170000",
        },
        lang: "en",
        nextEpisode: true,
        episodeSelector: true,
        autoplayNextEpisode: true,
      });
    } catch {
      return "";
    }
  }, [provider, media, initialTime]);

  // Handle load timeout
  useEffect(() => {
    setIsLoaded(false);
    setHasTimedOut(false);

    const timer = setTimeout(() => {
      setIsLoaded((loaded) => {
        if (!loaded) {
          setHasTimedOut(true);
        }
        return loaded;
      });
    }, loadTimeoutMs || 12000);

    return () => clearTimeout(timer);
  }, [embedUrl, loadTimeoutMs]);

  // Track embed_not_available if timeout occurs
  useEffect(() => {
    if (hasTimedOut) {
      trackEvent({
        action: "embed_not_available",
        params: {
          content_id: String(media.mediaId),
          media_type: media.mediaType,
          title: media.title,
        },
      });
    }
  }, [hasTimedOut, media]);

  // Track media_start on first load
  useEffect(() => {
    if (isLoaded && !startedRef.current) {
      startedRef.current = true;
      trackEvent({
        action: "media_start",
        params: {
          content_id: String(media.mediaId),
          media_type: media.mediaType,
          title: media.title,
          season: media.seasonNumber ?? undefined,
          episode: media.episodeNumber ?? undefined,
        },
      });
    }
  }, [isLoaded, media]);

  // Fallback 60s progress check for providers without events
  useEffect(() => {
    if (provider?.capabilities.events) return;

    // After 60 seconds of playback, register that it started
    const timer = setTimeout(() => {
      onTimeUpdate?.(60, 0, {
        seasonNumber: media.seasonNumber ?? undefined,
        episodeNumber: media.episodeNumber ?? undefined,
      });
    }, 60000);

    return () => clearTimeout(timer);
  }, [provider, media, onTimeUpdate]);

  // Bridge postMessage events
  useEmbedBridge({
    serverId: currentServerId,
    iframeRef,
    onEvent: (event) => {
      if (event.event === "play") {
        trackEvent({
          action: "media_play",
          params: {
            content_id: String(media.mediaId),
            media_type: media.mediaType,
            current_time: Math.round(event.currentTime ?? 0),
          },
        });
      } else if (event.event === "pause") {
        trackEvent({
          action: "media_pause",
          params: {
            content_id: String(media.mediaId),
            media_type: media.mediaType,
            current_time: Math.round(event.currentTime ?? 0),
          },
        });
      }
    },
    onTimeUpdate: (current, duration) => {
      setIsLoaded(true);
      setHasTimedOut(false);
      onTimeUpdate?.(current, duration, {
        seasonNumber: media.seasonNumber ?? undefined,
        episodeNumber: media.episodeNumber ?? undefined,
      });

      if (duration > 0) {
        const percent = Math.floor((current / duration) * 100);
        const milestones = [25, 50, 75, 90, 100] as const;
        for (const m of milestones) {
          if (percent >= m && !reachedMilestonesRef.current.has(m)) {
            reachedMilestonesRef.current.add(m);
            trackEvent({
              action: "media_milestone",
              params: {
                content_id: String(media.mediaId),
                media_type: media.mediaType,
                milestone: m,
                duration: Math.round(duration),
                title: media.title,
              },
            });
          }
        }
      }
    },
    onEnded: () => {
      onEnded?.();
      // Auto navigate to next episode if available
      if (media.mediaType === "tv" && media.seasonNumber && media.episodeNumber && onNavigateEpisode) {
        const currentSeason = media.seasons?.find((s) => s.seasonNumber === media.seasonNumber);
        if (currentSeason && currentSeason.episodeCount && media.episodeNumber >= currentSeason.episodeCount) {
          const nextSeason = media.seasons?.find((s) => s.seasonNumber > media.seasonNumber!);
          if (nextSeason) {
            onNavigateEpisode(nextSeason.seasonNumber, 1);
            return;
          }
        }
        onNavigateEpisode(media.seasonNumber, media.episodeNumber + 1);
      }
    },
  });

  const nextServer = useMemo(() => {
    const currentIndex = servers.findIndex((s) => s.id === currentServerId);
    if (currentIndex >= 0 && currentIndex + 1 < servers.length) {
      return servers[currentIndex + 1];
    }
    return servers.find((s) => s.id !== currentServerId);
  }, [servers, currentServerId]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      {/* Floating mid-right edge server trigger */}
      {servers.length > 1 && (
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Switch streaming server"
          title={`Server: ${provider?.name ?? currentServerId}`}
          className="group absolute right-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1.5 pl-2.5 pr-1.5 py-3 rounded-l-2xl border-l border-y border-white/20 bg-black/60 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/85 transition-all duration-200 translate-x-3 hover:translate-x-0 shadow-2xl shadow-black/80 focus:translate-x-0 focus:outline-none focus:ring-2 focus:ring-red-500/50"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:animate-pulse" />
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-200 group-hover:-translate-x-0.5"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* Loading & Timeout Overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none">
          {media.backdropPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={buildImageUrl(media.backdropPath, "original") || ""}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
            />
          )}


          {!hasTimedOut ? (
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-white/70">Connecting to {provider?.name ?? "stream"}...</p>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col items-center gap-4 text-center px-4 max-w-md pointer-events-auto">
              <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Playback taking longer than expected</h3>
                <p className="text-xs text-white/60 mt-1">
                  The current server might be experiencing high load or restrictions.
                </p>
              </div>
              {nextServer && (
                <button
                  type="button"
                  onClick={() => handleServerSelect(nextServer.id)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs transition-colors shadow-lg shadow-red-600/30"
                >
                  Switch to {nextServer.name}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Embedded Player Iframe */}
      {embedUrl ? (
        <iframe
          key={`${currentServerId}-${media.mediaId}-${media.seasonNumber ?? 0}-${media.episodeNumber ?? 0}`}
          ref={iframeRef}
          src={embedUrl}
          title={media.title}
          allow={provider?.iframe.allow ?? "encrypted-media; autoplay *; fullscreen *"}
          allowFullScreen
          referrerPolicy={provider?.iframe.referrerPolicy ?? "origin"}
          sandbox={provider?.iframe.sandbox}
          className="w-full h-full border-0"
          onLoad={() => setIsLoaded(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
          No embed player available for this media.
        </div>
      )}

      {/* Server Selection Drawer */}
      <ServerDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        servers={servers}
        currentServerId={currentServerId}
        onSelectServer={handleServerSelect}
        onOpenAdBlockGuide={() => setIsAdBlockModalOpen(true)}
      />

      {/* AdBlock Onboarding / Help Modal */}
      <AdBlockModal
        isOpen={isAdBlockModalOpen}
        onClose={() => setIsAdBlockModalOpen(false)}
      />
    </div>
  );
}
