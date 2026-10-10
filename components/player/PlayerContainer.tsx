import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

import type {
  Episode,
  MediaSegment,
  PlayerMedia,
  PlayerSeason,
  PlayerSettings,
} from "./types";
import {
  HISTORY_SAVE_INTERVAL_MS,
  MIN_INTRO_START_TIME_SEC,
  MIN_REMAINING_INTRO_TIME_SEC,
} from "./constants";

import { getSeasonEpisodes } from "@/lib/api/episodes";
import { formatRuntime } from "@/lib/utils/media";

import { usePlayerControls } from "./hooks/usePlayerControls";
import { usePlayerState } from "./hooks/usePlayerState";
import { useSubtitles } from "./hooks/useSubtitles";
import { usePlayerShortcuts } from "./hooks/usePlayerShortcuts";
import { usePlayerSource } from "./hooks/usePlayerSource";
import { useHlsPlayback } from "./hooks/useHlsPlayback";
import { useIsTouchDevice } from "./hooks/useIsTouchDevice";
import { useSettings } from "@/hooks/useSettings";
import { createSegmentByteCache } from "@/lib/player/media/segmentByteCache";

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

  // Modals and Popovers state
  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const [isAudioSubtitlesOpen, setIsAudioSubtitlesOpen] = useState(false);
  const [isEpisodesOpen, setIsEpisodesOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const isTv = media.mediaType === "tv";
  const seasons = useMemo<PlayerSeason[]>(() => media.seasons ?? [], [media.seasons]);

  const [currentSeason, setCurrentSeason] = useState<number>(media.seasonNumber ?? 1);
  const [currentEpisode, setCurrentEpisode] = useState<number>(media.episodeNumber ?? 1);
  const [drawerSeason, setDrawerSeason] = useState<number>(media.seasonNumber ?? 1);
  const [episodesBySeason, setEpisodesBySeason] = useState<Record<number, Episode[]>>({});
  const [isEpisodesLoading, setIsEpisodesLoading] = useState(false);

  const currentMediaKey = `${media.mediaType}-${media.mediaId}-${isTv ? currentSeason : 0}-${isTv ? currentEpisode : 0}`;

  // Domain Hook: Source & Server management
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

  const mediaKey = useMemo(() => {
    if (isTv) {
      return `${media.mediaId}:s${currentSeason}:e${currentEpisode}`;
    }
    return `${media.mediaId}`;
  }, [isTv, media.mediaId, currentSeason, currentEpisode]);

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

  // Domain Hook: Subtitles management
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

  // Domain Hook: Keyboard shortcuts & feedback indicators
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
              void orientation.lock("landscape").catch(() => {});
            }
          } catch {
            // Orientation lock may not be supported on this platform
          }
        })
        .catch(() => {});
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
  }

  function handleUnlock() {
    setIsLocked(false);
    controls.showControls();
  }

  // Domain Hook: Media Engine & HLS Playback lifecycle
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

  const activeSeasonInfo = useMemo(
    () => seasons.find((s) => s.seasonNumber === currentSeason) ?? null,
    [seasons, currentSeason]
  );
  const currentSeasonEpisodes = episodesBySeason[currentSeason] ?? [];
  const drawerEpisodes = episodesBySeason[drawerSeason] ?? [];

  const isLastEpisode = useMemo(() => {
    if (!activeSeasonInfo) {
      return false;
    }

    const isLastOfSeason = currentEpisode >= activeSeasonInfo.episodeCount;
    if (!isLastOfSeason) {
      return false;
    }

    const hasNextSeason = seasons.some(
      (s) => s.seasonNumber > currentSeason && s.episodeCount > 0
    );
    return !hasNextSeason;
  }, [activeSeasonInfo, currentEpisode, currentSeason, seasons]);

  const hasNext = isTv && currentSeasonEpisodes.length > 0 && !isLastEpisode;

  // Fetch episodes for current and drawer seasons
  useEffect(() => {
    if (!isTv) {
      return;
    }

    const seasonsToLoad = [currentSeason, drawerSeason].filter(
      (s, idx, arr) => arr.indexOf(s) === idx && !episodesBySeason[s]
    );

    if (seasonsToLoad.length === 0) {
      return;
    }

    let isCurrent = true;
    setIsEpisodesLoading(true);

    Promise.all(
      seasonsToLoad.map(async (s) => {
        try {
          const data = await getSeasonEpisodes(media.mediaId, s);
          return {
            season: s,
            episodes: data.episodes.map((episode) => ({
              id: episode.id,
              seasonNumber: episode.seasonNumber,
              episodeNumber: episode.episodeNumber,
              name: episode.name,
              overview: episode.overview,
              stillPath: episode.stillPath,
              runtime: episode.runtime,
              airDate: episode.airDate,
              voteAverage: episode.voteAverage,
            })),
          };
        } catch {
          return null;
        }
      })
    )
      .then((results) => {
        if (!isCurrent) return;
        const updates: Record<number, Episode[]> = {};
        for (const res of results) {
          if (res) {
            updates[res.season] = res.episodes;
          }
        }
        if (Object.keys(updates).length > 0) {
          setEpisodesBySeason((prev) => ({ ...prev, ...updates }));
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsEpisodesLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [currentSeason, drawerSeason, episodesBySeason, isTv, media.mediaId]);

  const currentEpisodeData = useMemo(() => {
    if (!isTv) return null;
    const episodes = episodesBySeason[currentSeason] ?? [];
    return episodes.find((episode) => episode.episodeNumber === currentEpisode) ?? null;
  }, [isTv, episodesBySeason, currentSeason, currentEpisode]);

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

  // Initial stream load
  const initialMediaKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialMediaKeyRef.current !== currentMediaKey) {
      initialMediaKeyRef.current = currentMediaKey;
      void loadStream(settings.serverId);
    }
  }, [currentMediaKey, loadStream, settings.serverId]);

  // Watch history saving interval
  useEffect(() => {
    if (!stream.source) {
      return;
    }

    const saveHistory = () => {
      onTimeUpdate?.(videoRef.current?.currentTime ?? 0, videoRef.current?.duration ?? 0, {
        seasonNumber: isTv ? currentSeason : undefined,
        episodeNumber: isTv ? currentEpisode : undefined,
      });
    };

    const interval = window.setInterval(saveHistory, HISTORY_SAVE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [currentEpisode, currentSeason, isTv, onTimeUpdate, stream.source]);

  // Popover hover listeners
  const isHoverSupported = () =>
    typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const handleQualityMouseEnter = () => {
    if (!isHoverSupported()) return;
    if (qualityTimerRef.current) clearTimeout(qualityTimerRef.current);
    if (audioTimerRef.current) clearTimeout(audioTimerRef.current);
    setIsAudioSubtitlesOpen(false);
    setIsQualityOpen(true);
  };

  const handleQualityMouseLeave = () => {
    if (!isHoverSupported()) return;
    if (qualityTimerRef.current) clearTimeout(qualityTimerRef.current);
    qualityTimerRef.current = setTimeout(() => {
      setIsQualityOpen(false);
    }, 150);
  };

  const handleAudioMouseEnter = () => {
    if (!isHoverSupported()) return;
    if (qualityTimerRef.current) clearTimeout(qualityTimerRef.current);
    if (audioTimerRef.current) clearTimeout(audioTimerRef.current);
    setIsQualityOpen(false);
    setIsAudioSubtitlesOpen(true);
  };

  const handleAudioMouseLeave = () => {
    if (!isHoverSupported()) return;
    if (audioTimerRef.current) clearTimeout(audioTimerRef.current);
    audioTimerRef.current = setTimeout(() => {
      setIsAudioSubtitlesOpen(false);
    }, 150);
  };

  // Clean up popover hover timeouts on unmount
  useEffect(() => {
    return () => {
      if (qualityTimerRef.current) clearTimeout(qualityTimerRef.current);
      if (audioTimerRef.current) clearTimeout(audioTimerRef.current);
    };
  }, []);

  // Fetch subtitles if not yet fetched when user opens audio/subtitles popover
  useEffect(() => {
    if (isAudioSubtitlesOpen) {
      subtitles.fetchSubtitles();
    }
  }, [isAudioSubtitlesOpen, subtitles]);

  const handleToggleAutoNext = useCallback(() => {
    updatePlayback({ autoplay: !appSettings.playback.autoplay });
  }, [appSettings.playback.autoplay, updatePlayback]);

  // Segment resolution (Skip Intro / Next Episode via SkipDB)
  const [apiSegments, setApiSegments] = useState<MediaSegment[]>([]);
  const [dismissedIntro, setDismissedIntro] = useState(false);
  const [hasSkippedIntro, setHasSkippedIntro] = useState(false);
  const [dismissedNext, setDismissedNext] = useState(false);
  const [isNavigatingNext, setIsNavigatingNext] = useState(false);
  const fetchedSegmentKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setApiSegments([]);
    setDismissedIntro(false);
    setHasSkippedIntro(false);
    setDismissedNext(false);
    setIsNavigatingNext(false);
    fetchedSegmentKeyRef.current = null;
  }, [currentMediaKey]);

  useEffect(() => {
    if (!stream.source?.url) {
      return;
    }

    if (fetchedSegmentKeyRef.current === currentMediaKey) {
      return;
    }
    fetchedSegmentKeyRef.current = currentMediaKey;

    const controller = new AbortController();
    const seasonParam = isTv ? currentSeason : undefined;
    const episodeParam = isTv ? currentEpisode : undefined;
    const durationParam =
      playerState.duration > 0
        ? Math.round(playerState.duration)
        : media.runtime
        ? Math.round(media.runtime * 60)
        : undefined;

    const params = new URLSearchParams();
    if (media.imdbId) params.set("imdb_id", media.imdbId);
    if (media.mediaId) params.set("tmdb_id", String(media.mediaId));
    params.set("media_type", media.mediaType);
    if (seasonParam) params.set("season", String(seasonParam));
    if (episodeParam) params.set("episode", String(episodeParam));
    if (durationParam) params.set("duration", String(durationParam));

    fetch(`/api/segments?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (!data || typeof data !== "object") return;
        const res = data as { segments?: MediaSegment[] };
        if (Array.isArray(res.segments) && res.segments.length > 0) {
          setApiSegments(res.segments);
        }
      })
      .catch(() => {});

    return () => {
      controller.abort();
    };
  }, [
    currentEpisode,
    currentMediaKey,
    currentSeason,
    isTv,
    media.imdbId,
    media.mediaId,
    media.mediaType,
    media.runtime,
    playerState.duration,
    stream.source?.url,
  ]);

  const handleNavigate = useCallback(
    (seasonNumber: number, episodeNumber: number) => {
      setCurrentSeason(seasonNumber);
      setCurrentEpisode(episodeNumber);
      setDrawerSeason(seasonNumber);
      setIsEpisodesOpen(false);
      onNavigateEpisode?.(seasonNumber, episodeNumber);
    },
    [onNavigateEpisode]
  );

  const handleNextEpisode = useCallback(() => {
    if (!activeSeasonInfo) {
      setIsNavigatingNext(false);
      return;
    }

    if (currentEpisode < activeSeasonInfo.episodeCount) {
      handleNavigate(currentSeason, currentEpisode + 1);
      return;
    }

    const nextSeason = seasons.find(
      (s) => s.seasonNumber > currentSeason && s.episodeCount > 0
    );
    if (nextSeason) {
      handleNavigate(nextSeason.seasonNumber, 1);
    } else {
      setIsNavigatingNext(false);
    }
  }, [activeSeasonInfo, currentEpisode, currentSeason, handleNavigate, seasons]);

  const resolvedSegments =
    media.segments && media.segments.length > 0 ? media.segments : apiSegments;

  const introSegment = resolvedSegments.find(
    (s) => s.type === "intro" || s.type === "recap"
  );

  // If user seeks backwards before the intro start threshold, reset skip states
  useEffect(() => {
    if (!introSegment) return;
    const minStart = Math.max(introSegment.start, MIN_INTRO_START_TIME_SEC);
    if (playerState.currentTime < minStart) {
      setDismissedIntro(false);
      setHasSkippedIntro(false);
    }
  }, [introSegment, playerState.currentTime]);

  const isIntroActive = useMemo(() => {
    if (hasSkippedIntro || !introSegment) return false;
    const time = playerState.currentTime;
    const minStart = Math.max(introSegment.start, MIN_INTRO_START_TIME_SEC);

    // Skip segments shorter than the start delay + minimum remaining time
    if (introSegment.end - minStart < MIN_REMAINING_INTRO_TIME_SEC) {
      return false;
    }

    const isWithinIntro = time >= minStart && time < introSegment.end - 1;
    if (!isWithinIntro || dismissedIntro) return false;

    return true;
  }, [dismissedIntro, hasSkippedIntro, introSegment, playerState.currentTime]);

  const handleSkipIntro = useCallback(() => {
    if (!introSegment) return;
    setHasSkippedIntro(true);
    setDismissedIntro(true);
    playerState.seekTo(introSegment.end);
  }, [introSegment, playerState]);

  useEffect(() => {
    if (!appSettings.playback.autoSkipIntro || hasSkippedIntro || !introSegment) {
      return;
    }

    const time = playerState.currentTime;
    const minStart = Math.max(introSegment.start, MIN_INTRO_START_TIME_SEC);
    if (introSegment.end - minStart < MIN_REMAINING_INTRO_TIME_SEC) {
      return;
    }

    if (time >= minStart && time < introSegment.end) {
      setHasSkippedIntro(true);
      setDismissedIntro(true);
      playerState.seekTo(introSegment.end);
    }
  }, [appSettings.playback.autoSkipIntro, hasSkippedIntro, introSegment, playerState]);

  const outroSegment = resolvedSegments.find((s) => s.type === "outro");
  const isNextEpisodeActive = useMemo(() => {
    if (!isTv || !hasNext || dismissedNext) return false;
    const time = playerState.currentTime;
    if (outroSegment) {
      return time >= outroSegment.start;
    }
    return playerState.duration > 30 && time >= playerState.duration - 15;
  }, [dismissedNext, hasNext, isTv, outroSegment, playerState.currentTime, playerState.duration]);

  useEffect(() => {
    if (!playerState.isEnded) {
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
  }, []);

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
  const isSpinnerActive = isLoading || playerState.isBuffering;
  // On touch devices the center buttons show the buffering spinner themselves while visible.
  const areTouchControlsShown = isTouchDevice && controls.areControlsVisible && !isLocked;

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black overflow-hidden select-none">
      {/* Subtitle Appearance Dynamic Cue Style */}
      <style jsx global>{`
        video::cue {
          color: ${subtitles.subtitleStyles.color} !important;
          background-color: ${subtitles.subtitleStyles.backgroundColor} !important;
          font-size: ${subtitles.subtitleStyles.fontSize} !important;
          font-family: ${subtitles.subtitleStyles.fontFamily} !important;
          text-shadow: ${subtitles.subtitleStyles.textShadow} !important;
        }
      `}</style>

      <div className="flex h-full w-full">
        <div className="cineby-container relative top-0 left-0 w-full h-full flex justify-center items-center">
          {/* Video */}
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



          {/* Top Header Bar */}
          <PlayerHeader
            title={media.title}
            subtitle={computedHeaderSubtitle}
            onBack={onBack}
            visible={controls.areControlsVisible && !isLocked}
            inert={isLocked}
            rightSlot={
              <div className="flex items-center gap-1 md:gap-4 flex-shrink-0 relative">
                {/* Quality Button with Hover/Click Popover */}
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
                    className={`tabbable flex items-center gap-2 p-2 md:px-3 md:py-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-all text-sm font-semibold ${
                      isQualityOpen ? "bg-white/20 text-white" : ""
                    }`}
                  >
                    <svg
                      className="w-6 h-6 flex-shrink-0"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      color="currentColor"
                    >
                      <path
                        d="M14 12L10.5 14V10L14 12Z"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2 12.7075V11.2924C2 8.39705 2 6.94939 2.90549 6.01792C3.81099 5.08645 5.23656 5.04613 8.08769 4.96549C9.43873 4.92728 10.8188 4.8999 12 4.8999C13.1812 4.8999 14.5613 4.92728 15.9123 4.96549C18.7634 5.04613 20.189 5.08645 21.0945 6.01792C22 6.94939 22 8.39705 22 11.2924V12.7075C22 15.6028 22 17.0505 21.0945 17.9819C20.189 18.9134 18.7635 18.9537 15.9124 19.0344C14.5613 19.0726 13.1812 19.1 12 19.1C10.8188 19.1 9.43867 19.0726 8.0876 19.0344C5.23651 18.9537 3.81097 18.9134 2.90548 17.9819C2 17.0505 2 15.6028 2 12.7075Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
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

                {/* Audio & Subtitles Button with Hover/Click Popover */}
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
                    className={`tabbable flex items-center gap-2 p-2 md:px-3 md:py-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-all text-sm font-semibold ${
                      isAudioSubtitlesOpen ? "bg-white/20 text-white" : ""
                    }`}
                  >
                    <svg
                      className="w-6 h-6 flex-shrink-0"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      color="currentColor"
                    >
                      <path
                        d="M1 15V9C1 5.68629 3.68629 3 7 3H17C20.3137 3 23 5.68629 23 9V15C23 18.3137 20.3137 21 17 21H7C3.68629 21 1 18.3137 1 15Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M10.5 10L10.3284 9.82843C9.79799 9.29799 9.07857 9 8.32843 9C6.76633 9 5.5 10.2663 5.5 11.8284V12.1716C5.5 13.7337 6.76633 15 8.32843 15C9.07857 15 9.79799 14.702 10.3284 14.1716L10.5 14"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M18.5 10L18.3284 9.82843C17.798 9.29799 17.0786 9 16.3284 9C14.7663 9 13.5 10.2663 13.5 11.8284V12.1716C13.5 13.7337 14.7663 15 16.3284 15C17.0786 15 17.798 14.702 18.3284 14.1716L18.5 14"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
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
                  />
                </div>

                {/* Next Episode Button in Header (TV only) */}
                {isTv && hasNext ? (
                  <button
                    type="button"
                    onClick={handleNextEpisode}
                    className="tabbable flex items-center gap-2 p-2 md:px-3 md:py-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-all text-sm font-semibold"
                  >
                    <svg
                      className="w-6 h-6 flex-shrink-0"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      color="currentColor"
                    >
                      <path
                        d="M18 7V17"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6.97179 5.2672C6.57832 4.95657 6 5.23682 6 5.73813V18.2619C6 18.7632 6.57832 19.0434 6.97179 18.7328L14.9035 12.4709C15.2078 12.2307 15.2078 11.7693 14.9035 11.5291L6.97179 5.2672Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="hidden md:inline">Next Episode</span>
                  </button>
                ) : null}
              </div>
            }
          />

          {/* Buffering Indicator */}
          {isSpinnerActive && !areTouchControlsShown ? (
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
              <LoadingSpinner className="[&>svg]:h-7 [&>svg]:w-7" />
            </div>
          ) : null}

          {/* Stream Error Toast */}
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : null}

          {/* Skip Intro / Next Episode Floating Action Button */}
          {isLocked ? null : isIntroActive ? (
            <PlayerActionButton
              label="Skip Intro"
              durationMs={5000}
              onClick={handleSkipIntro}
              onDismiss={() => setDismissedIntro(true)}
              isControlsVisible={controls.areControlsVisible}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" />
                  <line x1="19" y1="5" x2="19" y2="19" />
                </svg>
              }
            />
          ) : isNextEpisodeActive ? (
            <PlayerActionButton
              label="Next Episode"
              durationMs={5000}
              isLoading={isNavigatingNext}
              onClick={() => {
                if (isNavigatingNext) return;
                setIsNavigatingNext(true);
                handleNextEpisode();
              }}
              onExpire={() => {
                if (appSettings.playback.autoplay) {
                  if (isNavigatingNext) return;
                  setIsNavigatingNext(true);
                  handleNextEpisode();
                } else {
                  setDismissedNext(true);
                }
              }}
              onDismiss={() => setDismissedNext(true)}
              isControlsVisible={controls.areControlsVisible}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" />
                  <line x1="19" y1="5" x2="19" y2="19" />
                </svg>
              }
            />
          ) : null}

          {/* Bottom Controls Bar */}
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
                  <svg
                    className={`w-3.5 h-3.5 flex-shrink-0 text-gray-300 transition-transform duration-200 ${
                      isEpisodesOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              ) : null
            }
          />

          {/* Touch devices: playback buttons in the center, volume on the right */}
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
              <TouchVolumeControl
                visible={controls.areControlsVisible}
                volume={playerState.volume}
                muted={playerState.muted}
                onVolumeChange={playerState.setVolume}
                onToggleMute={playerState.toggleMute}
              />
            </>
          ) : null}

          {/* Screen lock: left-center button while unlocked, input-swallowing overlay while locked */}
          {isLocked ? (
            <LockOverlay onUnlock={handleUnlock} />
          ) : (
            <LockButton visible={controls.areControlsVisible} onLock={handleLock} />
          )}

          {/* Episodes Modal (TV only) */}
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
