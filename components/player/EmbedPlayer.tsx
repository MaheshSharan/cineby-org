import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { trackEvent } from "@/lib/analytics/gtag";

import type { PlayerMedia } from "./types";
import { ONBOARD_ADS_PLAYER_INFO_KEY } from "./types";
import { ServerDrawer } from "./ui/ServerDrawer";
import { AdBlockModal } from "./ui/AdBlockModal";
import { useEmbedBridge } from "./hooks/useEmbedBridge";
import { initAntiRedirectShield, setAntiRedirectShieldActive } from "@/lib/security/antiRedirect";
import { getEmbedProvider } from "@/lib/embeds/registry";
import { canUseSandbox, rememberSandboxRefusal, SANDBOX_CHECK_MS } from "@/lib/embeds/sandboxPolicy";
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
  /** `liveSeconds` is how far the viewer had played in this player when they switched. */
  onSelectServer: (serverId: string, liveSeconds: number) => void;
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
  const liveSecondsRef = useRef(0);
  const hasPlaybackRef = useRef(false);
  const firstTimeRef = useRef<number | null>(null);
  // Iframe whose sandboxed load reported no playback, so it was reloaded without the sandbox.
  const [unsandboxedKey, setUnsandboxedKey] = useState<string | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reachedMilestonesRef = useRef<Set<number>>(new Set());
  // Episode the viewer moved to inside the embedded player, so history is saved against it.
  const playingEpisodeRef = useRef<{ seasonNumber: number; episodeNumber: number } | null>(null);
  const { settings } = useSettings();
  const embedTheme = getEmbedTheme(settings.appearance.theme);

  // Auto-hide controls after inactivity
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showControls = useCallback(() => {
    setIsControlsVisible(true);
    clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setIsControlsVisible(false), 3000);
  }, []);
  useEffect(() => {
    showControls();
    return () => clearTimeout(controlsTimerRef.current);
  }, [showControls]);

  // On mobile the cross-origin iframe swallows touch events, so the parent div never fires
  // onTouchStart/onTouchMove. When the user taps the embed, the window loses focus — use that
  // as the signal to briefly surface the server selector for 3 seconds.
  useEffect(() => {
    const handleWindowBlur = () => showControls();
    window.addEventListener("blur", handleWindowBlur);
    return () => window.removeEventListener("blur", handleWindowBlur);
  }, [showControls]);

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
    liveSecondsRef.current = 0;
    hasPlaybackRef.current = false;
    firstTimeRef.current = null;
  }, [media.mediaId, media.seasonNumber, media.episodeNumber, currentServerId]);

  // Terminate previous stream on server/media change. Guard prevents StrictMode's
  // double-invoke from blanking the iframe before the first real load.
  const cleanupMountedRef = useRef(false);
  useEffect(() => {
    if (!cleanupMountedRef.current) {
      cleanupMountedRef.current = true;
      return;
    }
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
      // Time reached in a different episode (picked inside the embed) says nothing about the one being reloaded.
      const playing = playingEpisodeRef.current;
      const isSameEpisode =
        !playing || (playing.seasonNumber === media.seasonNumber && playing.episodeNumber === media.episodeNumber);
      onSelectServer(serverId, isSameEpisode ? liveSecondsRef.current : 0);
    },
    [currentServerId, onSelectServer, media.mediaId, media.mediaType, media.seasonNumber, media.episodeNumber]
  );

  const resumeSec =
    initialTime > 0
      ? initialTime
      : media.progressSeconds && media.progressSeconds > 0
      ? media.progressSeconds
      : undefined;

  const iframeKey = `${currentServerId}-${media.mediaId}-${media.seasonNumber ?? 0}-${media.episodeNumber ?? 0}`;

  const isSandboxed = Boolean(
    provider?.iframe.sandbox && unsandboxedKey !== iframeKey && canUseSandbox(currentServerId)
  );

  // A server that refuses the sandbox never plays inside it: give it one unsandboxed try.
  useEffect(() => {
    if (!isSandboxed) return;

    const timer = setTimeout(() => {
      if (!hasPlaybackRef.current) setUnsandboxedKey(iframeKey);
    }, SANDBOX_CHECK_MS);

    return () => clearTimeout(timer);
  }, [isSandboxed, iframeKey]);

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
      // A blocked player can still send time updates stuck at one value, so only advancing time proves playback.
      if (event.event === "timeupdate" && event.currentTime !== undefined) {
        firstTimeRef.current ??= event.currentTime;
        if (event.currentTime - firstTimeRef.current >= 1) hasPlaybackRef.current = true;
      }
      if (event.event === "play") hasPlaybackRef.current = true;

      if (hasPlaybackRef.current) {
        // Playing only once the sandbox was dropped means this server refuses it.
        if (unsandboxedKey === iframeKey) rememberSandboxRefusal(currentServerId);
      }

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
      liveSecondsRef.current = current;
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
    <div
      className="relative w-full h-full bg-black overflow-hidden select-none"
      onMouseMove={showControls}
      onMouseEnter={showControls}
      onTouchStart={showControls}
      onTouchMove={showControls}
    >
      {/* Floating mid-right edge server trigger — hides with controls */}
      {servers.length > 1 && (
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Switch streaming server"
          title={`Server: ${provider?.name ?? currentServerId}`}
          className={`group absolute right-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1.5 pl-2.5 pr-1.5 py-3 rounded-l-2xl border-l border-y border-white/20 bg-black/60 backdrop-blur-md text-white/80 hover:text-white transition-all duration-300 translate-x-0 md:translate-x-3 md:hover:translate-x-0 shadow-2xl shadow-black/80 focus:translate-x-0 focus:outline-none ${isControlsVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
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
          key={`${iframeKey}-${isSandboxed ? "sandboxed" : "open"}`}
          ref={iframeRef}
          src={embedUrl}
          title={media.title}
          allow={provider?.iframe.allow ?? "encrypted-media; autoplay *; fullscreen *"}
          allowFullScreen
          referrerPolicy={provider?.iframe.referrerPolicy ?? "origin"}
          sandbox={isSandboxed ? provider?.iframe.sandbox : undefined}
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
