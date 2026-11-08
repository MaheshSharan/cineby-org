import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { trackEvent } from "@/lib/analytics/gtag";

import type { PlayerMedia } from "./types";
import { ONBOARD_ADS_PLAYER_INFO_KEY } from "./types";
import { ServerDrawer } from "./ui/ServerDrawer";
import { AdBlockModal } from "./ui/AdBlockModal";
import { useEmbedBridge } from "./hooks/useEmbedBridge";
import { useIsLandscape } from "./hooks/useIsLandscape";
import { useIsFullscreen } from "./hooks/useIsFullscreen";
import { useIsTouchDevice } from "./hooks/useIsTouchDevice";
import { initAntiRedirectShield, setAntiRedirectShieldActive } from "@/lib/security/antiRedirect";
import { getEmbedProvider } from "@/lib/embeds/registry";
import { getEmbedTheme } from "@/lib/embeds/theme";
import { buildSourceImageUrl } from "@/lib/tmdb/image";
import { useSettings } from "@/hooks/useSettings";
import type { PlayerServerOption } from "@/lib/player/modeConfig";

// Short enough to feel instant, long enough to hide the embed's first blank frame.
const IFRAME_REVEAL_DELAY_MS = 150;

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
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reachedMilestonesRef = useRef<Set<number>>(new Set());
  // Episode the viewer moved to inside the embedded player, so history is saved against it.
  const playingEpisodeRef = useRef<{ seasonNumber: number; episodeNumber: number } | null>(null);
  const { settings } = useSettings();
  const embedTheme = getEmbedTheme(settings.appearance.theme);

  const isTouchDevice = useIsTouchDevice();
  const isLandscape = useIsLandscape();
  const isFullscreen = useIsFullscreen();

  // Fullscreen + Landscape rotation action for mobile portrait mode
  const handleToggleFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        const root = document.documentElement;
        if (root.requestFullscreen) {
          void root.requestFullscreen().catch(() => {});
        } else if ((root as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          void (root as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen().catch(() => {});
        }

        const orientation = window.screen.orientation as {
          lock?: (orientation: string) => Promise<void>;
        };
        if (typeof orientation?.lock === "function") {
          void orientation.lock("landscape").catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          void document.exitFullscreen().catch(() => {});
        } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
          void (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen().catch(() => {});
        }
        const orientation = window.screen.orientation as {
          unlock?: () => void;
        };
        if (typeof orientation?.unlock === "function") {
          try {
            orientation.unlock();
          } catch {}
        }
      }
    } catch {
      // Ignore unsupported platforms
    }
  }, []);

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
    playingEpisodeRef.current = null;
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

  // Initialize anti-redirect & anti-popup shield
  useEffect(() => {
    initAntiRedirectShield();
    setAntiRedirectShieldActive(true);
    return () => {
      setAntiRedirectShieldActive(false);
    };
  }, []);

  const handleServerSelect = useCallback(
    (serverId: string) => {
      if (serverId === currentServerId) {
        setIsDrawerOpen(false);
        return;
      }
      trackEvent({
        action: "server_fallback_triggered",
        params: {
          content_id: String(media.mediaId),
          media_type: media.mediaType,
          from_server: currentServerId,
          to_server: serverId,
          reason: "user_switch",
        },
      });
      if (iframeRef.current) {
        try {
          iframeRef.current.src = "about:blank";
        } catch {}
      }
      setIsLoaded(false);
      onSelectServer(serverId);
    },
    [currentServerId, onSelectServer, media.mediaId, media.mediaType]
  );

  const resumeSec =
    initialTime > 0
      ? initialTime
      : media.progressSeconds && media.progressSeconds > 0
      ? media.progressSeconds
      : undefined;

  // Construct iframe URL
  const embedUrl = useMemo(() => {
    if (!provider) return "";
    try {
      const isAnime = Boolean(media.anilistId);
      const effectiveType = isAnime ? "anime" : media.mediaType;

      return provider.buildUrl({
        type: effectiveType,
        title: media.title,
        // Third-party players fetch this themselves, so it must be the direct TMDB URL.
        posterUrl: buildSourceImageUrl(media.backdropPath, "w1280") ?? undefined,
        tmdbId: media.mediaId,
        imdbId: media.imdbId ?? undefined,
        anilistId: media.anilistId ?? undefined,
        season: media.seasonNumber && media.seasonNumber > 0 ? media.seasonNumber : 1,
        episode: media.episodeNumber && media.episodeNumber > 0 ? media.episodeNumber : 1,
        startAtSec: resumeSec,
        progress: resumeSec,
        autoplay: true,
        theme: embedTheme,
        lang: "en",
        nextEpisode: true,
        episodeSelector: true,
        autoplayNextEpisode: true,
      });
    } catch {
      return "";
    }
  }, [provider, media, resumeSec, embedTheme]);

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
    }, loadTimeoutMs || 8000);

    return () => clearTimeout(timer);
  }, [embedUrl, loadTimeoutMs]);

  // Smooth dismiss handler when iframe HTML loads
  const handleIframeLoad = useCallback(() => {
    // Embeds without a start-time URL parameter are told the resume position by message.
    if (provider?.resume && resumeSec) {
      iframeRef.current?.contentWindow?.postMessage(
        provider.resume.buildMessage(resumeSec),
        provider.resume.targetOrigin
      );
    }

    clearTimeout(revealTimerRef.current);
    revealTimerRef.current = setTimeout(() => setIsLoaded(true), IFRAME_REVEAL_DELAY_MS);
  }, [provider, resumeSec]);

  // A pending reveal must not mark the next server (or an unmounted player) as loaded.
  useEffect(() => {
    return () => clearTimeout(revealTimerRef.current);
  }, [currentServerId, media.mediaId, media.seasonNumber, media.episodeNumber]);

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
      trackEvent({
        action: "stream_buffering_stalled",
        params: {
          content_id: String(media.mediaId),
          media_type: media.mediaType,
          server: currentServerId,
          stall_duration_ms: loadTimeoutMs || 8000,
          current_time: 0,
        },
      });
    }
  }, [hasTimedOut, media, currentServerId, loadTimeoutMs]);

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

  useEmbedBridge({
    serverId: currentServerId,
    iframeRef,
    onEvent: (event) => {
      if (event.season && event.episode) {
        playingEpisodeRef.current = { seasonNumber: event.season, episodeNumber: event.episode };
      }

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
      const playing = playingEpisodeRef.current;
      onTimeUpdate?.(current, duration, {
        seasonNumber: playing?.seasonNumber ?? media.seasonNumber ?? undefined,
        episodeNumber: playing?.episodeNumber ?? media.episodeNumber ?? undefined,
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
      // These embeds run their own Up Next, so navigating here would reload the player mid-countdown.
      if (provider?.capabilities.handlesNextEpisode) return;

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

  return (
    <div className="relative w-full h-[100dvh] bg-black overflow-hidden select-none">
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

      {/* Mobile Portrait Quick Fullscreen / Auto-Rotate Action Pill */}
      {isTouchDevice && !isLandscape && !isFullscreen && (
        <button
          type="button"
          onClick={handleToggleFullscreen}
          aria-label="Rotate to Landscape Fullscreen"
          className="absolute top-4 right-4 z-30 flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/75 hover:bg-black/90 border border-white/20 backdrop-blur-md text-white text-xs font-semibold shadow-xl shadow-black/80 transition-all active:scale-95 cursor-pointer"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
          <span>Fullscreen</span>
        </button>
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
          onLoad={handleIframeLoad}
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
