import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { trackEvent } from "@/lib/analytics/gtag";

import type { PlayerMedia } from "./types";
import { ONBOARD_ADS_PLAYER_INFO_KEY } from "./types";
import { ServerDrawer } from "./ui/ServerDrawer";
import { AdBlockModal } from "./ui/AdBlockModal";
import { useEmbedBridge } from "./hooks/useEmbedBridge";
import { initAntiRedirectShield, setAntiRedirectShieldActive } from "@/lib/security/antiRedirect";
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

  // Smooth dismiss handler when iframe HTML loads
  const handleIframeLoad = useCallback(() => {
    // Dismiss the heavy spinner overlay after a graceful 600ms transition
    // so the provider's internal UI takes over without visual stall
    const dismissTimer = setTimeout(() => {
      setIsLoaded(true);
    }, 600);
    return () => clearTimeout(dismissTimer);
  }, []);

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
