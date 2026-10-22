import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

import type {
  Episode,
  PlayerMedia,
  PlayerSeason,
  PlayerSettings,
} from "./types";
import { HISTORY_SAVE_INTERVAL_MS } from "./constants";

import { formatRuntime, getMediaKey } from "@/lib/utils/media";

import { usePlayerControls } from "./hooks/usePlayerControls";
import { usePlayerState } from "./hooks/usePlayerState";
import { useSubtitles } from "./hooks/useSubtitles";
import { usePlayerShortcuts } from "./hooks/usePlayerShortcuts";
import { usePlayerSource } from "./hooks/usePlayerSource";
import { useHlsPlayback } from "./hooks/useHlsPlayback";
import { useIsTouchDevice } from "./hooks/useIsTouchDevice";
import { useIsFullscreen } from "./hooks/useIsFullscreen";
import { useIsLandscape } from "./hooks/useIsLandscape";
import { useMediaSession } from "./hooks/useMediaSession";
import { useWakeLock } from "./hooks/useWakeLock";
import { usePlayerEpisodes } from "./hooks/usePlayerEpisodes";
import { usePlayerSegments } from "./hooks/usePlayerSegments";
import { useSettings } from "@/hooks/useSettings";
import { buildImageUrl } from "@/lib/tmdb/image";
import { createSegmentByteCache } from "@/lib/player/media/segmentByteCache";
import { trackEvent } from "@/lib/analytics/gtag";

import { AudioSubtitlesPopover } from "./ui/AudioSubtitlesPopover";
import { EpisodesDrawer } from "./ui/EpisodesDrawer";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { LockButton } from "./ui/LockButton";
import { LockOverlay } from "./ui/LockOverlay";
import { PlayerActionButton } from "./ui/PlayerActionButton";
import { PlayerControls } from "./ui/PlayerControls";
import { PlayerHeader } from "./ui/PlayerHeader";
import { QualityPopover } from "./ui/QualityPopover";
import { TouchPlaybackControls } from "./ui/TouchPlaybackControls";
import { TouchVolumeControl } from "./ui/TouchVolumeControl";
import {
  PlayerQualityIcon,
  PlayerAudioSubtitlesIcon,
  PlayerNextEpisodeIcon,
  StepForwardIcon,
  XIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";

interface PlayerContainerProps {
  media: PlayerMedia;
  subtitle?: string;
  onBack?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number, playback?: { seasonNumber?: number; episodeNumber?: number }) => void;
  onEnded?: () => void;
  onNavigateEpisode?: (seasonNumber: number, episodeNumber: number) => void;
}

export function PlayerContainer({
  media,
  subtitle,
  onBack,
  onTimeUpdate,
  onEnded,
  onNavigateEpisode,
}: PlayerContainerProps) {
  const { settings: appSettings, updatePlayback } = useSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const endedRef = useRef(false);

  const qualityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [settings, setSettings] = useState<PlayerSettings>({
    volume: 0.8,
    muted: false,
    rate: 1,
    quality: null,
    serverId: "default",
    subtitleLang: null,
    autoNext: true,
  });

  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const [isAudioSubtitlesOpen, setIsAudioSubtitlesOpen] = useState(false);
  const [isEpisodesOpen, setIsEpisodesOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const isTv = media.mediaType === "tv";
  const seasons = useMemo<PlayerSeason[]>(() => media.seasons ?? [], [media.seasons]);

  const {
    currentSeason,
    currentEpisode,
    drawerSeason,
    setDrawerSeason,
    drawerEpisodes,
    currentEpisodeData,
    isEpisodesLoading,
    isLastEpisode,
    hasNext,
    handleNavigate,
    handleNextEpisode,
  } = usePlayerEpisodes({
    mediaId: media.mediaId,
    isTv,
    seasons,
    initialSeason: media.seasonNumber ?? 1,
    initialEpisode: media.episodeNumber ?? 1,
    onNavigateEpisode: (season, ep) => {
      setIsEpisodesOpen(false);
      onNavigateEpisode?.(season, ep);
    },
  });

  const currentSeasonVal = isTv ? currentSeason : 0;
  const currentEpisodeVal = isTv ? currentEpisode : 0;
  const mediaKey = getMediaKey(media.mediaType, media.mediaId, currentSeasonVal, currentEpisodeVal);

  const {
    stream,
    isResolvingStream,
    activeServerId,
    pendingServerId,
    failedServerIds,
    serverOptions,
    filteredServerGroups,
    resumeTime,
    handleServerChange,
    handlePlaybackFailure,
    setStream,
    loadStream,
    markServerSuccess,
  } = usePlayerSource({
    media,
    currentSeason,
    currentEpisode,
    isTv,
    videoRef,
  });

  const segmentByteCache = useMemo(() => {
    return createSegmentByteCache();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset cache when active mediaKey changes
  }, [mediaKey]);

  const router = useRouter();
  const initialSeekTime = useMemo(() => {
    const rawT = router.query.t;
    if (typeof rawT === "string") {
      const parsed = Number.parseFloat(rawT);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return 0;
  }, [router.query.t]);

  const playerState = usePlayerState({
    videoRef,
    initialSeekTime,
  });
  const { setRate } = playerState;

  const subtitles = useSubtitles({
    videoRef,
    mediaId: media.mediaId,
    mediaType: media.mediaType,
    currentSeason,
    currentEpisode,
    isTv,
    activeServerId: stream.source?.id || activeServerId,
    sourceUrl: stream.source?.url,
    autoSubtitles: appSettings.playback.autoSubtitles,
    preferredLanguage: appSettings.playback.preferredLanguage,
    subtitlesSettings: appSettings.subtitles,
  });

  function closePopovers() {
    setIsQualityOpen(false);
    setIsAudioSubtitlesOpen(false);
    setIsEpisodesOpen(false);
  }

  const { seekFeedback, handleDoubleTapSeek } = usePlayerShortcuts({
    isQualityOpen,
    isAudioSubtitlesOpen,
    isEpisodesOpen,
    onClosePopovers: closePopovers,
    onSeekBy: playerState.seekBy,
  });

  function toggleFullscreen() {
    const element = containerRef.current;
    if (!element) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void element
        .requestFullscreen()
        .then(() => {
          try {
            const orientation = window.screen.orientation as {
              lock?: (orientation: string) => Promise<void>;
            };
            if (typeof orientation?.lock === "function") {
              void orientation.lock("landscape").catch(() => { });
            }
          } catch {
            // Orientation lock may not be supported on this platform
          }
        })
        .catch(() => { });
    }
  }

  const controls = usePlayerControls({
    containerRef,
    seekTime: appSettings.playback.seekTime,
    isLocked,
    onTogglePlay: playerState.togglePlay,
    onSeekBy: playerState.seekBy,
    onDoubleTapSeek: handleDoubleTapSeek,
    onToggleMute: playerState.toggleMute,
    onToggleFullscreen: toggleFullscreen,
    onToggleSettings: () => {
      setIsAudioSubtitlesOpen(false);
      setIsQualityOpen((open) => !open);
    },
    onToggleSubtitles: () => {
      setIsQualityOpen(false);
      setIsAudioSubtitlesOpen((open) => !open);
    },
  });

  function handleLock() {
    closePopovers();
    setIsLocked(true);
    try {
      const orientation = window.screen.orientation as {
        type?: string;
        lock?: (orientation: string) => Promise<void>;
      };
      if (typeof orientation?.lock === "function") {
        const currentType = orientation.type;
        const targetOrientation =
          currentType === "landscape-secondary" ? "landscape-secondary" : "landscape-primary";
        void orientation.lock(targetOrientation).catch(() => {
          void orientation.lock?.("landscape").catch(() => { });
        });
      }
    } catch {
      // Orientation lock may not be supported on this platform
    }
  }

  function handleUnlock() {
    setIsLocked(false);
    controls.showControls();
    try {
      const orientation = window.screen.orientation as {
        lock?: (orientation: string) => Promise<void>;
      };
      if (typeof orientation?.lock === "function") {
        void orientation.lock("landscape").catch(() => { });
      }
    } catch {
      // Orientation lock may not be supported on this platform
    }
  }

  const { activeAbrLevel } = useHlsPlayback({
    videoRef,
    source: stream.source,
    mediaKey,
    cache: segmentByteCache,
    quality: settings.quality,
    resumeTime,
    onPlaybackSuccess: () => {
      if (stream.source) {
        markServerSuccess(stream.source.id || activeServerId);
      }
    },
    onPlaybackFailure: handlePlaybackFailure,
  });

  const computedHeaderSubtitle = useMemo(() => {
    if (isTv) {
      const episodePrefix = `S${currentSeason} E${currentEpisode}`;
      const episodeName = currentEpisodeData?.name ?? media.episodeName ?? "";
      const runtimeMinutes = currentEpisodeData?.runtime ?? media.runtime ?? null;
      const durationStr = runtimeMinutes
        ? formatRuntime(runtimeMinutes)
        : media.duration ?? "";

      const titlePart = episodeName ? `${episodePrefix} ${episodeName}` : episodePrefix;
      if (durationStr) {
        return `${titlePart} · ${durationStr}`;
      }
      return titlePart;
    }

    const year = media.releaseYear ?? "";
    const runtimeMinutes = media.runtime ?? null;
    const durationStr = runtimeMinutes
      ? formatRuntime(runtimeMinutes)
      : media.duration ?? "";

    if (year && durationStr) {
      return `${year} · ${durationStr}`;
    }
    if (durationStr) {
      return durationStr;
    }
    if (year) {
      return year;
    }
    return subtitle ?? "";
  }, [
    isTv,
    currentSeason,
    currentEpisode,
    currentEpisodeData,
    media.episodeName,
    media.runtime,
    media.duration,
    media.releaseYear,
    subtitle,
  ]);

  useWakeLock(playerState.isPlaying);

  const mediaSessionTitle = useMemo(() => {
    if (isTv) {
      const epName = currentEpisodeData?.name ?? media.episodeName ?? "";
      return epName ? `S${currentSeason}E${currentEpisode}: ${epName}` : `S${currentSeason}E${currentEpisode}`;
    }
    return media.title;
  }, [isTv, currentSeason, currentEpisode, currentEpisodeData?.name, media.episodeName, media.title]);

  const mediaSessionAlbum = useMemo(() => {
    if (isTv) {
      return media.title;
    }
    return media.releaseYear ? `Movie (${media.releaseYear})` : "Movie";
  }, [isTv, media.title, media.releaseYear]);

  const mediaSessionArtworkUrl = useMemo(() => {
    const posterPath = media.posterPath || media.backdropPath;
    return buildImageUrl(posterPath, "w500");
  }, [media.posterPath, media.backdropPath]);

  useMediaSession({
    title: mediaSessionTitle,
    artist: isTv ? media.title : "Cineby",
    album: mediaSessionAlbum,
    artworkUrl: mediaSessionArtworkUrl,
    isPlaying: playerState.isPlaying,
    currentTime: playerState.currentTime,
    duration: playerState.duration,
    playbackRate: settings.rate,
    seekTime: appSettings.playback.seekTime,
    onPlay: playerState.play,
    onPause: playerState.pause,
    onSeekBy: playerState.seekBy,
    onSeekTo: playerState.seekTo,
  });

  // Initial stream load whenever mediaKey changes
  useEffect(() => {
    void loadStream(settings.serverId);
  }, [loadStream, mediaKey, settings.serverId]);

  // Track media start and milestone progress
  const startedRef = useRef(false);
  const reachedMilestonesRef = useRef<Set<number>>(new Set());

  // Reset milestone tracking when mediaKey changes
  useEffect(() => {
    startedRef.current = false;
    reachedMilestonesRef.current.clear();
  }, [mediaKey]);

  useEffect(() => {
    if (!playerState.isPlaying || startedRef.current || !stream.source) {
      return;
    }
    startedRef.current = true;
    trackEvent({
      action: "media_start",
      params: {
        content_id: String(media.mediaId),
        media_type: media.mediaType,
        title: media.title,
        season: isTv ? currentSeason : undefined,
        episode: isTv ? currentEpisode : undefined,
      },
    });
  }, [currentEpisode, currentSeason, isTv, media.mediaId, media.mediaType, media.title, playerState.isPlaying, stream.source]);

  // Milestone triggers (25%, 50%, 75%, 90%, 100%)
  useEffect(() => {
    const dur = playerState.duration;
    const cur = playerState.currentTime;
    if (!dur || dur <= 0 || !playerState.isPlaying) return;

    const percent = Math.floor((cur / dur) * 100);
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
            duration: Math.round(dur),
            title: media.title,
          },
        });
      }
    }
  }, [media.mediaId, media.mediaType, media.title, playerState.currentTime, playerState.duration, playerState.isPlaying]);

  // Stream failure telemetry
  useEffect(() => {
    if (stream.isError && !stream.source && !isResolvingStream) {
      trackEvent({
        action: "embed_not_available",
        params: {
          content_id: String(media.mediaId),
          media_type: media.mediaType,
          title: media.title,
        },
      });
    }
  }, [isResolvingStream, media.mediaId, media.mediaType, media.title, stream.isError, stream.source]);

  // Keep a stable ref for onTimeUpdate to prevent interval teardown when parent re-renders
  const onTimeUpdateRef = useRef(onTimeUpdate);
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    if (!stream.source) {
      return;
    }

    const video = videoRef.current;
    let lastSavedSecond = -1;

    const saveHistory = () => {
      const currentTime = video?.currentTime ?? 0;
      const second = Math.floor(currentTime);

      // Nothing to save at the very start, or when the position has not moved since the last save.
      if (second <= 0 || second === lastSavedSecond) return;
      lastSavedSecond = second;

      onTimeUpdateRef.current?.(currentTime, video?.duration ?? 0, {
        seasonNumber: isTv ? currentSeason : undefined,
        episodeNumber: isTv ? currentEpisode : undefined,
      });
    };

    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") saveHistory();
    };

    const interval = window.setInterval(saveHistory, HISTORY_SAVE_INTERVAL_MS);
    video?.addEventListener("pause", saveHistory);
    document.addEventListener("visibilitychange", saveWhenHidden);
    window.addEventListener("pagehide", saveHistory);

    return () => {
      window.clearInterval(interval);
      video?.removeEventListener("pause", saveHistory);
      document.removeEventListener("visibilitychange", saveWhenHidden);
      window.removeEventListener("pagehide", saveHistory);
    };
  }, [currentEpisode, currentSeason, isTv, stream.source]);

  // Cache hover support to avoid DOM layout queries on mouse interactions
  const isHoverSupportedRef = useRef(false);
  useEffect(() => {
    isHoverSupportedRef.current =
      typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }, []);

  const handleQualityMouseEnter = () => {
    if (!isHoverSupportedRef.current) return;
    if (qualityTimerRef.current) clearTimeout(qualityTimerRef.current);
    if (audioTimerRef.current) clearTimeout(audioTimerRef.current);
    setIsAudioSubtitlesOpen(false);
    setIsQualityOpen(true);
  };

  const handleQualityMouseLeave = () => {
    if (!isHoverSupportedRef.current) return;
    if (qualityTimerRef.current) clearTimeout(qualityTimerRef.current);
    qualityTimerRef.current = setTimeout(() => {
      setIsQualityOpen(false);
    }, 150);
  };

  const handleAudioMouseEnter = () => {
    if (!isHoverSupportedRef.current) return;
    if (qualityTimerRef.current) clearTimeout(qualityTimerRef.current);
    if (audioTimerRef.current) clearTimeout(audioTimerRef.current);
    setIsQualityOpen(false);
    setIsAudioSubtitlesOpen(true);
  };

  const handleAudioMouseLeave = () => {
    if (!isHoverSupportedRef.current) return;
    if (audioTimerRef.current) clearTimeout(audioTimerRef.current);
    audioTimerRef.current = setTimeout(() => {
      setIsAudioSubtitlesOpen(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (qualityTimerRef.current) clearTimeout(qualityTimerRef.current);
      if (audioTimerRef.current) clearTimeout(audioTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isAudioSubtitlesOpen) {
      subtitles.fetchSubtitles();
    }
  }, [isAudioSubtitlesOpen, subtitles]);

  const handleToggleAutoNext = useCallback(() => {
    updatePlayback({ autoplay: !appSettings.playback.autoplay });
  }, [appSettings.playback.autoplay, updatePlayback]);

  const {
    isIntroActive,
    handleSkipIntro,
    dismissIntro,
    isNextEpisodeActive,
    handleNextEpisodeClick,
    handleNextEpisodeExpire,
    dismissNext,
    isNavigatingNext,
  } = usePlayerSegments({
    mediaId: media.mediaId,
    imdbId: media.imdbId,
    mediaType: media.mediaType,
    currentSeason: isTv ? currentSeason : undefined,
    currentEpisode: isTv ? currentEpisode : undefined,
    duration: playerState.duration,
    runtime: media.runtime,
    mediaKey,
    streamUrl: stream.source?.url,
    staticSegments: media.segments,
    currentTime: playerState.currentTime,
    autoSkipIntro: appSettings.playback.autoSkipIntro,
    isTv,
    hasNext,
    onSeekTo: playerState.seekTo,
    onNextEpisode: handleNextEpisode,
    autoplay: appSettings.playback.autoplay,
  });

  useEffect(() => {
    if (!playerState.isEnded) {
      // Re-arm autoplay so the next episode's ending can advance again.
      endedRef.current = false;
      return;
    }

    if (appSettings.playback.autoplay && !endedRef.current && hasNext) {
      endedRef.current = true;
      handleNextEpisode();
      return;
    }

    if (appSettings.playback.autoplay && !endedRef.current && isLastEpisode) {
      endedRef.current = true;
      onEnded?.();
    }
  }, [playerState.isEnded, appSettings.playback.autoplay, hasNext, isLastEpisode, handleNextEpisode, onEnded]);

  const handleSeasonChange = useCallback((seasonNumber: number) => {
    setDrawerSeason(seasonNumber);
  }, [setDrawerSeason]);

  const handleEpisodeSelect = useCallback(
    (episode: Episode) => {
      handleNavigate(episode.seasonNumber, episode.episodeNumber);
    },
    [handleNavigate]
  );

  const handleQualityChange = useCallback((quality: PlayerSettings["quality"]) => {
    setSettings((current) => ({ ...current, quality }));
  }, []);

  const handleRateChange = useCallback(
    (rate: PlayerSettings["rate"]) => {
      setSettings((current) => ({ ...current, rate }));
      setRate(rate);
    },
    [setRate]
  );

  const isLoading = isResolvingStream && !stream.source;
  const isTouchDevice = useIsTouchDevice();
  const isFullscreen = useIsFullscreen();
  const isLandscape = useIsLandscape();
  const shouldShowTouchVolume = isTouchDevice && isFullscreen && isLandscape;
  const isSpinnerActive = isLoading || playerState.isBuffering;
  const areTouchControlsShown = isTouchDevice && controls.areControlsVisible && !isLocked;

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black overflow-hidden select-none">
      <style jsx global>{`
        ${subtitles.subtitleStyles.isNative ? "" : `
        video::cue {
          color: ${subtitles.subtitleStyles.color} !important;
          background-color: ${subtitles.subtitleStyles.backgroundColor} !important;
          font-size: ${subtitles.subtitleStyles.fontSize} !important;
          font-family: ${subtitles.subtitleStyles.fontFamily} !important;
          text-shadow: ${subtitles.subtitleStyles.textShadow} !important;
          line-height: 1.4 !important;
        }
        `}
      `}</style>

      <div className="flex h-full w-full">
        <div className="cineby-container relative top-0 left-0 w-full h-full flex justify-center items-center">
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              className="h-full w-full"
              playsInline
              preload="auto"
              crossOrigin="anonymous"
            />
          </div>

          <PlayerHeader
            title={media.title}
            subtitle={computedHeaderSubtitle}
            onBack={onBack}
            visible={controls.areControlsVisible && !isLocked}
            inert={isLocked}
            rightSlot={
              <div className="flex items-center gap-1 md:gap-4 flex-shrink-0 relative">
                <div
                  className="relative"
                  onMouseEnter={handleQualityMouseEnter}
                  onMouseLeave={handleQualityMouseLeave}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsAudioSubtitlesOpen(false);
                      setIsQualityOpen((prev) => !prev);
                    }}
                    className={`tabbable flex items-center gap-2 p-2 md:px-3 md:py-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-all text-sm font-semibold ${isQualityOpen ? "bg-white/20 text-white" : ""
                      }`}
                  >
                    <PlayerQualityIcon />
                    <span className="hidden md:inline">Quality</span>
                    <span className="hidden md:inline opacity-50 font-normal">
                      {settings.quality ?? (activeAbrLevel ? `Auto (${activeAbrLevel})` : "Auto")}
                    </span>
                  </button>

                  <QualityPopover
                    open={isQualityOpen}
                    quality={settings.quality}
                    onQualityChange={handleQualityChange}
                    serverGroups={filteredServerGroups}
                    servers={serverOptions}
                    activeServerId={activeServerId}
                    pendingServerId={pendingServerId}
                    failedServerIds={failedServerIds}
                    onServerChange={handleServerChange}
                    rate={settings.rate}
                    onRateChange={handleRateChange}
                    resolvedLevel={activeAbrLevel}
                  />
                </div>

                <div
                  className="relative"
                  onMouseEnter={handleAudioMouseEnter}
                  onMouseLeave={handleAudioMouseLeave}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsQualityOpen(false);
                      setIsAudioSubtitlesOpen((prev) => !prev);
                    }}
                    className={`tabbable flex items-center gap-2 p-2 md:px-3 md:py-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-all text-sm font-semibold ${isAudioSubtitlesOpen ? "bg-white/20 text-white" : ""
                      }`}
                  >
                    <PlayerAudioSubtitlesIcon />
                    <span className="hidden md:inline">Audio &amp; Subtitles</span>
                  </button>

                  <AudioSubtitlesPopover
                    open={isAudioSubtitlesOpen}
                    subtitleTracks={subtitles.availableSubtitles}
                    activeSubtitleId={subtitles.activeTrack?.id}
                    onSubtitleChange={subtitles.handleSubtitleChange}
                    onUploadSubtitle={subtitles.handleUploadSubtitle}
                    subtitlesEnabled={subtitles.subtitlesEnabled}
                    isSubtitlesFetching={subtitles.isSubtitlesFetching}
                    onToggleSubtitles={subtitles.handleToggleSubtitles}
                    onOpenOpenSubtitles={() => subtitles.fetchSubtitles(undefined, true)}
                  />
                </div>

                {isTv && hasNext ? (
                  <button
                    type="button"
                    onClick={handleNextEpisode}
                    className="tabbable flex items-center gap-2 p-2 md:px-3 md:py-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-all text-sm font-semibold"
                  >
                    <PlayerNextEpisodeIcon />
                    <span className="hidden md:inline">Next Episode</span>
                  </button>
                ) : null}
              </div>
            }
          />

          {isSpinnerActive && !areTouchControlsShown ? (
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
              <LoadingSpinner className="[&>svg]:h-7 [&>svg]:w-7" />
            </div>
          ) : null}

          {stream.isError && !isLocked ? (
            <div
              data-player-ui
              className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[60] player-surface rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-4 max-w-md w-[calc(100%-2rem)] animate-in fade-in slide-in-from-bottom-4 duration-300"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Unable to play this source</p>
                <p className="text-xs text-white/50 mt-0.5">Try a different server from Quality menu.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStream({ source: null, isError: false });
                  void loadStream(activeServerId);
                }}
                className="flex-shrink-0 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-white/90 cursor-pointer"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => setStream((prev) => ({ ...prev, isError: false }))}
                aria-label="Dismiss"
                className="flex-shrink-0 p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          ) : null}

          {isLocked ? null : isIntroActive ? (
            <PlayerActionButton
              label="Skip Intro"
              durationMs={5000}
              onClick={handleSkipIntro}
              onDismiss={dismissIntro}
              isControlsVisible={controls.areControlsVisible}
              icon={<StepForwardIcon />}
            />
          ) : isNextEpisodeActive ? (
            <PlayerActionButton
              label="Next Episode"
              durationMs={5000}
              isLoading={isNavigatingNext}
              onClick={handleNextEpisodeClick}
              onExpire={handleNextEpisodeExpire}
              onDismiss={dismissNext}
              isControlsVisible={controls.areControlsVisible}
              icon={<StepForwardIcon />}
            />
          ) : null}

          <PlayerControls
            visible={controls.areControlsVisible && !isLocked}
            inert={isLocked}
            showPlaybackControls={!isTouchDevice}
            isPlaying={playerState.isPlaying}
            currentTime={playerState.currentTime}
            duration={playerState.duration}
            bufferedTime={playerState.bufferedTime}
            src={stream.source?.url}
            mediaKey={mediaKey}
            cache={segmentByteCache}
            hoverThumbnails={appSettings.playback.hoverThumbnails}
            thumbnailTrack={stream.source?.thumbnail || stream.source?.thumbnails?.[0]?.url || null}
            volume={playerState.volume}
            muted={playerState.muted}
            seekTime={appSettings.playback.seekTime}
            onTogglePlay={playerState.togglePlay}
            onSeek={playerState.seekTo}
            onSeekBy={playerState.seekBy}
            onVolumeChange={playerState.setVolume}
            onToggleMute={playerState.toggleMute}
            onToggleFullscreen={toggleFullscreen}
            centerSlot={
              isTv ? (
                <button
                  type="button"
                  onClick={() => setIsEpisodesOpen(true)}
                  aria-label="Episodes"
                  className="tabbable group flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold backdrop-blur-md transition-all active:scale-95 cursor-pointer truncate max-w-full"
                >
                  <span className="truncate">Episodes</span>
                  <ChevronDownIcon
                    className={`w-3.5 h-3.5 flex-shrink-0 text-gray-300 transition-transform duration-200 ${isEpisodesOpen ? "rotate-180" : ""
                      }`}
                  />
                </button>
              ) : null
            }
          />

          {isTouchDevice && !isLocked ? (
            <>
              <TouchPlaybackControls
                visible={controls.areControlsVisible}
                isPlaying={playerState.isPlaying}
                isBuffering={isSpinnerActive}
                seekTime={appSettings.playback.seekTime}
                activeSeekSide={seekFeedback?.side}
                onTogglePlay={playerState.togglePlay}
                onSeekBy={playerState.seekBy}
              />
              {shouldShowTouchVolume ? (
                <TouchVolumeControl
                  visible={controls.areControlsVisible}
                  volume={playerState.volume}
                  muted={playerState.muted}
                  onVolumeChange={playerState.setVolume}
                  onToggleMute={playerState.toggleMute}
                />
              ) : null}
            </>
          ) : null}

          {isLocked ? (
            <LockOverlay onUnlock={handleUnlock} />
          ) : !isTouchDevice || isLandscape ? (
            <LockButton visible={controls.areControlsVisible} onLock={handleLock} />
          ) : null}

          {isTv ? (
            <EpisodesDrawer
              open={isEpisodesOpen}
              onClose={() => setIsEpisodesOpen(false)}
              title={media.title}
              seasons={seasons.map((season) => ({
                seasonNumber: season.seasonNumber,
                name: season.name,
                episodeCount: season.episodeCount,
                overview: season.overview,
              }))}
              episodes={drawerEpisodes}
              selectedSeason={drawerSeason}
              onSeasonChange={handleSeasonChange}
              onEpisodeSelect={handleEpisodeSelect}
              activeEpisodeNumber={currentEpisode}
              activeSeasonNumber={currentSeason}
              isLoading={isEpisodesLoading}
              autoNext={appSettings.playback.autoplay}
              onToggleAutoNext={handleToggleAutoNext}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
