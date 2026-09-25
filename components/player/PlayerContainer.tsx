import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

import type { Episode, MediaSegment, MediaSource, PlayerMedia, PlayerSeason, PlayerSettings, ServerGroup, ServerOption, SubtitleTrack } from "./types";
import { HISTORY_SAVE_INTERVAL_MS, SERVERS, SERVER_GROUPS, preloadFlags } from "./constants";
import { revokeAllBlobs, revokeBlob } from "./utils/blobPool";

import { createMediaEngine, type MediaEngine } from "./media";
import { resolveStream } from "./providers";
import { getSeasonEpisodes } from "@/lib/api/episodes";
import { formatRuntime } from "@/lib/utils/media";
import { srtToVtt } from "@/lib/utils/srtToVtt";

import { usePlayerControls } from "./hooks/usePlayerControls";
import { usePlayerState } from "./hooks/usePlayerState";
import { useSubtitles } from "./hooks/useSubtitles";
import { useSettings } from "@/hooks/useSettings";
import { createSegmentByteCache } from "@/lib/player/media/segmentByteCache";

import { AudioSubtitlesPopover } from "./ui/AudioSubtitlesPopover";
import { EpisodesDrawer } from "./ui/EpisodesDrawer";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { PlayerActionButton } from "./ui/PlayerActionButton";
import { PlayerControls } from "./ui/PlayerControls";
import { PlayerHeader } from "./ui/PlayerHeader";
import { QualityPopover } from "./ui/QualityPopover";

interface PlayerContainerProps {
  media: PlayerMedia;
  subtitle?: string;
  onBack?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number, playback?: { seasonNumber?: number; episodeNumber?: number }) => void;
  onEnded?: () => void;
  onNavigateEpisode?: (seasonNumber: number, episodeNumber: number) => void;
}

interface StreamState {
  source: MediaSource | null;
  isError: boolean;
}

function detectFormat(url: string): MediaSource["format"] {
  const lower = url.toLowerCase();
  if (lower.includes(".m3u8")) return "hls";
  if (lower.includes(".mpd")) return "dash";
  if (lower.includes(".mp4")) return "mp4";
  if (lower.includes(".webm")) return "webm";
  if (lower.includes(".mkv")) return "mkv";
  return "unknown";
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
  const mediaEngineRef = useRef<MediaEngine | null>(null);
  const streamRequestControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  // Deferred stream abort so React DEV StrictMode's synthetic unmount/remount
  // does not kill the initial request. Cancelled on remount; a real unmount
  // never remounts so the abort still fires.
  const pendingStreamAbortRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedRef = useRef(false);

  const qualityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeBlobUrlsRef = useRef<Set<string>>(new Set());
  const customSubtitleUrlRef = useRef<string | null>(null);

  const [settings, setSettings] = useState<PlayerSettings>({
    volume: 0.8,
    muted: false,
    rate: 1,
    quality: null,
    serverId: "default",
    subtitleLang: null,
    autoNext: true,
  });

  const [activeServerId, setActiveServerId] = useState<string>("default");
  const [pendingServerId, setPendingServerId] = useState<string | null>(null);
  const [failedServerIds, setFailedServerIds] = useState<Record<string, boolean>>({});
  const failedTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastWorkingServerIdRef = useRef<string>("default");
  const [stream, setStream] = useState<StreamState>({ source: null, isError: false });
  const [isResolvingStream, setIsResolvingStream] = useState(true);
  const [availableSources, setAvailableSources] = useState<MediaSource[]>([]);
  const [availableSubtitles, setAvailableSubtitles] = useState<SubtitleTrack[]>([]);
  const [activeAbrLevel, setActiveAbrLevel] = useState<string | null>(null);
  const [activeProviders, setActiveProviders] = useState<{ id: string; name: string }[]>([]);

  // Fetch enabled providers dynamically to respect ENABLE_VIDY, ENABLE_VIDKING, ENABLE_VIXSRC
  useEffect(() => {
    let isCurrent = true;
    fetch("/api/stream/providers")
      .then((res) => (res.ok ? res.json() : { providers: [] }))
      .then((data: unknown) => {
        if (!isCurrent) return;
        if (data && typeof data === "object" && "providers" in data && Array.isArray((data as { providers: unknown }).providers)) {
          setActiveProviders((data as { providers: { id: string; name: string }[] }).providers);
        }
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, []);

  // Preload server/subtitle flag icons centrally so they render instantly without pop-in
  useEffect(() => {
    preloadFlags(["us", "de", "fr", "in", "mx", "es", "ja", "ko", "it", "pt", "ru", "zh"]);
  }, []);

  // Subtitle lazy-fetch state: disabled by default until user opts in
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [isSubtitlesFetching, setIsSubtitlesFetching] = useState(false);
  // Cache flag: once fetched for a given media key, don't re-fetch on re-enable
  const subtitlesFetchedRef = useRef(false);
  // AbortController for in-flight subtitle fetch (cancelled on media change)
  const subtitleFetchControllerRef = useRef<AbortController | null>(null);

  // Modals and Popovers state
  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const [isAudioSubtitlesOpen, setIsAudioSubtitlesOpen] = useState(false);
  const [isEpisodesOpen, setIsEpisodesOpen] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState<{
    side: "left" | "right";
    seconds: number;
    key: number;
  } | null>(null);

  const isTv = media.mediaType === "tv";
  const seasons = useMemo<PlayerSeason[]>(() => media.seasons ?? [], [media.seasons]);

  const [currentSeason, setCurrentSeason] = useState<number>(media.seasonNumber ?? 1);
  const [currentEpisode, setCurrentEpisode] = useState<number>(media.episodeNumber ?? 1);
  const [drawerSeason, setDrawerSeason] = useState<number>(media.seasonNumber ?? 1);
  const [episodesBySeason, setEpisodesBySeason] = useState<Record<number, Episode[]>>({});
  const [isEpisodesLoading, setIsEpisodesLoading] = useState(false);

  const activeSeasonInfo = useMemo(
    () => seasons.find((season) => season.seasonNumber === currentSeason) ?? null,
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
      (season) => season.seasonNumber > currentSeason && season.episodeCount > 0
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

  const router = useRouter();
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
  const { setRate, seekBy: playerSeekBy } = playerState;

  const handleDoubleTapSeek = useCallback(
    (seconds: number, side: "left" | "right") => {
      playerSeekBy(seconds);
      setSeekFeedback({ side, seconds: Math.abs(seconds), key: Date.now() });
    },
    [playerSeekBy]
  );

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

  const controls = usePlayerControls({
    containerRef,
    seekTime: appSettings.playback.seekTime,
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

  const subtitles = useSubtitles({ videoRef });

  const currentMediaKey = `${media.mediaType}-${media.mediaId}-${isTv ? currentSeason : 0}-${isTv ? currentEpisode : 0}`;
  const lastMediaKeyRef = useRef<string>(currentMediaKey);

  const loadStreamRef = useRef<(serverId: string, options?: { forcedTime?: number; fallbackServerId?: string; isFallback?: boolean }) => Promise<void>>(() => Promise.resolve());

  const triggerServerFailure = useCallback(
    (failedServerId: string, fallbackServerId: string, resumeTime: number) => {
      // Mark failed for 5 seconds
      setFailedServerIds((prev) => ({ ...prev, [failedServerId]: true }));
      const existingTimer = failedTimersRef.current.get(failedServerId);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(() => {
        setFailedServerIds((prev) => {
          const next = { ...prev };
          delete next[failedServerId];
          return next;
        });
        failedTimersRef.current.delete(failedServerId);
      }, 5000);
      failedTimersRef.current.set(failedServerId, timer);

      setPendingServerId(null);

      // Revert automatically to the last healthy fallback server
      if (fallbackServerId && fallbackServerId !== failedServerId) {
        void loadStreamRef.current(fallbackServerId, { forcedTime: resumeTime, isFallback: true });
      }
    },
    []
  );

  const loadStream = useCallback(
    async (
      serverId: string,
      options?: { forcedTime?: number; fallbackServerId?: string; isFallback?: boolean }
    ) => {
      const element = videoRef.current;
      if (!element) return;

      const isSameMedia = lastMediaKeyRef.current === currentMediaKey;
      lastMediaKeyRef.current = currentMediaKey;

      // Remember current playback position so changing servers resumes from the exact spot
      const previousTime =
        typeof options?.forcedTime === "number"
          ? options.forcedTime
          : isSameMedia && element.currentTime > 0
          ? element.currentTime
          : 0;

      const requestId = ++requestIdRef.current;
      streamRequestControllerRef.current?.abort();
      const controller = new AbortController();
      streamRequestControllerRef.current = controller;
      setIsResolvingStream(true);
      setStream((current) => ({ ...current, isError: false }));

      const request = {
        mediaType: media.mediaType,
        mediaId: media.mediaId,
        seasonNumber: isTv ? currentSeason : undefined,
        episodeNumber: isTv ? currentEpisode : undefined,
        signal: controller.signal,
      };

      let result;
      try {
        result = await resolveStream(serverId, request);
      } catch {
        result = null;
      }

      // A canceled request is not a provider failure and must never surface
      // as "Unable to play this source". Replacement requests bump
      // requestIdRef; only the newest request may attach a result.
      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        return;
      }
      setIsResolvingStream(false);

      const source = result?.source ?? null;

      // Source resolution failure handling
      if (!source) {
        if (options?.fallbackServerId) {
          triggerServerFailure(serverId, options.fallbackServerId, previousTime);
        } else {
          setPendingServerId(null);
          setStream({ source: null, isError: true });
        }
        return;
      }

      if (result?.sources && result.sources.length > 0) {
        setAvailableSources(result.sources);
      }

      // Format detection
      const format = source.format === "unknown" ? detectFormat(source.url) : source.format;

      if (mediaEngineRef.current) {
        mediaEngineRef.current.destroy();
        mediaEngineRef.current = null;
      }

      setActiveAbrLevel(null);

      // Flag to track if media played or failed
      let hasCommitted = false;
      const commitSuccess = () => {
        if (hasCommitted) return;
        hasCommitted = true;
        setPendingServerId(null);
        const playingServerId = source.id || serverId;
        setActiveServerId(playingServerId);
        lastWorkingServerIdRef.current = playingServerId;
      };

      const handlePlaybackFailure = () => {
        if (hasCommitted) return;
        hasCommitted = true;
        if (options?.fallbackServerId) {
          triggerServerFailure(serverId, options.fallbackServerId, previousTime);
        } else {
          setPendingServerId(null);
          setStream({ source: null, isError: true });
        }
      };

      const engine = createMediaEngine(element, source.url, format, {
        onLevelSwitched: (levelHeight) => {
          setActiveAbrLevel(`${levelHeight}p`);
        },
        onError: () => {
          handlePlaybackFailure();
        },
        cache: segmentByteCache,
        mediaKey,
      });
      mediaEngineRef.current = engine;

      // Restore playback position seamlessly from the exact spot
      if (previousTime > 0) {
        const restoreTime = () => {
          try {
            if (element.duration && previousTime < element.duration) {
              element.currentTime = previousTime;
            } else if (!element.duration) {
              element.currentTime = previousTime;
            }
          } catch {}
        };

        if (element.readyState >= 1) {
          restoreTime();
        } else {
          element.addEventListener("loadedmetadata", restoreTime, { once: true });
        }
      }

      // Mark successful playback once media is ready to play
      const onCanPlay = () => {
        commitSuccess();
        element.removeEventListener("canplay", onCanPlay);
        element.removeEventListener("error", onError);
      };
      const onError = () => {
        handlePlaybackFailure();
        element.removeEventListener("canplay", onCanPlay);
        element.removeEventListener("error", onError);
      };

      element.addEventListener("canplay", onCanPlay, { once: true });
      element.addEventListener("error", onError, { once: true });

      endedRef.current = false;
      setStream({ source, isError: false });
      void element.play().catch(() => {});
    },
    [currentEpisode, currentMediaKey, currentSeason, isTv, media.mediaId, media.mediaType, mediaKey, segmentByteCache, triggerServerFailure]
  );
  loadStreamRef.current = loadStream;

  // Reset subtitle state when navigating to a new media (episode/movie change)
  const prevMediaKeyRef = useRef(currentMediaKey);
  useEffect(() => {
    if (prevMediaKeyRef.current === currentMediaKey) return;
    prevMediaKeyRef.current = currentMediaKey;
    revokeAllBlobs();
    subtitleFetchControllerRef.current?.abort();
    subtitleFetchControllerRef.current = null;
    setSubtitlesEnabled(false);
    setIsSubtitlesFetching(false);
    setAvailableSubtitles([]);
    subtitlesFetchedRef.current = false;
    subtitles.selectTrack(null);
  }, [currentMediaKey, subtitles]);

  const fetchSubtitles = useCallback(
    (targetLang: string = appSettings.playback.preferredLanguage || "en") => {
      if (subtitlesFetchedRef.current) {
        return;
      }

      subtitlesFetchedRef.current = true;
      setIsSubtitlesFetching(true);

      const controller = new AbortController();
      subtitleFetchControllerRef.current = controller;

      const params = new URLSearchParams({
        tmdbId: media.mediaId.toString(),
        type: media.mediaType,
        server: activeServerId,
      });
      if (isTv) {
        params.set("season", currentSeason.toString());
        params.set("episode", currentEpisode.toString());
      }

      fetch(`/api/stream/subtitles?${params.toString()}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : { subtitles: [] }))
        .then((data: unknown) => {
          if (controller.signal.aborted) return;
          const tracks =
            data && typeof data === "object" && "subtitles" in data
              ? (data as { subtitles: SubtitleTrack[] }).subtitles
              : [];

          if (tracks.length > 0) {
            const normalizedLang = targetLang.toLowerCase();
            const preferredTrack =
              tracks.find((s) => {
                const code = (s.lang || "").toLowerCase();
                const label = (s.label || "").toLowerCase();
                return code === normalizedLang || code.startsWith(normalizedLang) || label.includes(normalizedLang);
              }) ??
              tracks.find((s) => s.lang.toLowerCase() === "en" || s.label.toLowerCase().includes("english")) ??
              tracks[0] ??
              null;

            if (preferredTrack) {
              subtitles.selectTrack(preferredTrack);
              const reordered = [preferredTrack, ...tracks.filter((t) => t.id !== preferredTrack.id)];
              setAvailableSubtitles(reordered);
              setSubtitlesEnabled(true);
              return;
            }
          }

          setAvailableSubtitles(tracks);
        })
        .catch(() => {
          // Aborted or network error: leave list empty
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSubtitlesFetching(false);
          }
        });
    },
    [activeServerId, appSettings.playback.preferredLanguage, currentEpisode, currentSeason, isTv, media.mediaId, media.mediaType, subtitles]
  );

  const handleToggleSubtitles = useCallback(() => {
    setSubtitlesEnabled((enabled) => {
      const nextEnabled = !enabled;

      if (!nextEnabled) {
        subtitles.selectTrack(null);
        return false;
      }

      if (subtitlesFetchedRef.current) {
        if (!subtitles.activeTrack && availableSubtitles.length > 0) {
          subtitles.selectTrack(availableSubtitles[0]);
        }
        return true;
      }

      fetchSubtitles();
      return true;
    });
  }, [availableSubtitles, fetchSubtitles, subtitles]);

  // Auto-fetch & select subtitles when autoSubtitles setting is enabled
  useEffect(() => {
    if (!appSettings.playback.autoSubtitles || !stream.source?.url) {
      return;
    }

    if (!subtitlesFetchedRef.current) {
      fetchSubtitles(appSettings.playback.preferredLanguage || "en");
    }
  }, [appSettings.playback.autoSubtitles, appSettings.playback.preferredLanguage, fetchSubtitles, stream.source?.url]);

  // Stream load on initial mount or when media changes (episode/movie switch)
  const initialMediaKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialMediaKeyRef.current !== currentMediaKey) {
      initialMediaKeyRef.current = currentMediaKey;
      void loadStream(settings.serverId);
    }
  }, [currentMediaKey, loadStream, settings.serverId]);

  useEffect(() => {
    // StrictMode remount cancels the synthetic cleanup's deferred abort.
    if (pendingStreamAbortRef.current) {
      clearTimeout(pendingStreamAbortRef.current);
      pendingStreamAbortRef.current = null;
    }

    const abortStreamSync = () => {
      streamRequestControllerRef.current?.abort();
      streamRequestControllerRef.current = null;
    };

    const scheduleStreamAbort = () => {
      const controller = streamRequestControllerRef.current;
      if (!controller) {
        return;
      }
      pendingStreamAbortRef.current = setTimeout(() => {
        controller.abort();
        if (streamRequestControllerRef.current === controller) {
          streamRequestControllerRef.current = null;
        }
        pendingStreamAbortRef.current = null;
      }, 0);
    };

    const onUnmount = () => {
      subtitleFetchControllerRef.current?.abort();
      subtitleFetchControllerRef.current = null;
      mediaEngineRef.current?.destroy();
      mediaEngineRef.current = null;

      if (qualityTimerRef.current) clearTimeout(qualityTimerRef.current);
      if (audioTimerRef.current) clearTimeout(audioTimerRef.current);

      failedTimersRef.current.forEach((timer) => clearTimeout(timer));
      failedTimersRef.current.clear();

      revokeAllBlobs();
      activeBlobUrlsRef.current.forEach((url) => {
        revokeBlob(url);
      });
      activeBlobUrlsRef.current.clear();
      customSubtitleUrlRef.current = null;

      const video = videoRef.current;
      if (video) {
        video.removeAttribute("src");
        video.load();
      }
    };

    // Page unload has no remount, so abort the stream synchronously.
    const handleBeforeUnload = () => {
      onUnmount();
      abortStreamSync();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      onUnmount();
      // Deferred: a StrictMode synthetic cleanup is immediately followed by
      // this effect re-running, which cancels the pending abort. A real
      // unmount never re-runs, so the abort fires and cancels the request.
      scheduleStreamAbort();
    };
  }, []);

  useEffect(() => {
    if (mediaEngineRef.current && "setQuality" in mediaEngineRef.current) {
      mediaEngineRef.current.setQuality(settings.quality);
    }
  }, [settings.quality]);

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

  // Close open popovers with Escape
  useEffect(() => {
    if (!isQualityOpen && !isAudioSubtitlesOpen && !isEpisodesOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsQualityOpen(false);
        setIsAudioSubtitlesOpen(false);
        setIsEpisodesOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isQualityOpen, isAudioSubtitlesOpen, isEpisodesOpen]);

  // Unlock orientation when fullscreen exits (e.g. back gesture or button)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        try {
          const orientation = window.screen.orientation as {
            unlock?: () => void;
          };
          if (typeof orientation?.unlock === "function") {
            orientation.unlock();
          }
        } catch {
          // Orientation unlock may not be supported
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Auto-dismiss double-tap seek feedback indicator
  useEffect(() => {
    if (!seekFeedback) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSeekFeedback(null);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [seekFeedback]);

  const handleToggleAutoNext = useCallback(() => {
    updatePlayback({ autoplay: !appSettings.playback.autoplay });
  }, [appSettings.playback.autoplay, updatePlayback]);

  // Segment resolution (Skip Intro / Next Episode via SkipDB)
  const [apiSegments, setApiSegments] = useState<MediaSegment[]>([]);
  const [dismissedIntro, setDismissedIntro] = useState(false);
  const [dismissedNext, setDismissedNext] = useState(false);
  const [isNavigatingNext, setIsNavigatingNext] = useState(false);
  const fetchedSegmentKeyRef = useRef<string | null>(null);

  // Reset dismiss and navigating states on episode/media switch
  useEffect(() => {
    setApiSegments([]);
    setDismissedIntro(false);
    setDismissedNext(false);
    setIsNavigatingNext(false);
    fetchedSegmentKeyRef.current = null;
  }, [currentMediaKey]);

  // Fetch segments (IntroDB with SkipDB fallback) only after stream URL is resolved (zero interference during provider scraping)
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
      .catch(() => {
        // Silently ignore aborted or failed requests
      });

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
      (season) => season.seasonNumber > currentSeason && season.episodeCount > 0
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
  const isIntroActive = useMemo(() => {
    if (dismissedIntro || !introSegment) return false;
    const time = playerState.currentTime;
    return time >= introSegment.start && time < introSegment.end;
  }, [dismissedIntro, introSegment, playerState.currentTime]);

  const handleSkipIntro = useCallback(() => {
    if (!introSegment) return;
    setDismissedIntro(true);
    playerState.seekTo(introSegment.end);
  }, [introSegment, playerState]);

  // Auto-skip intro if enabled in user playback settings
  useEffect(() => {
    if (!appSettings.playback.autoSkipIntro || dismissedIntro || !introSegment) {
      return;
    }

    const time = playerState.currentTime;
    if (time >= introSegment.start && time < introSegment.end) {
      setDismissedIntro(true);
      playerState.seekTo(introSegment.end);
    }
  }, [appSettings.playback.autoSkipIntro, dismissedIntro, introSegment, playerState]);

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

  const handleServerChange = useCallback(
    (serverId: string) => {
      if (serverId === activeServerId || serverId === pendingServerId) {
        return;
      }
      const element = videoRef.current;
      const currentTime = element && element.currentTime > 0 ? element.currentTime : 0;
      const fallbackServerId = lastWorkingServerIdRef.current || activeServerId || "default";

      setPendingServerId(serverId);
      void loadStream(serverId, {
        forcedTime: currentTime,
        fallbackServerId,
      });
    },
    [activeServerId, loadStream, pendingServerId]
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

  const handleUploadSubtitle = useCallback(
    async (file: File) => {
      const prevUrl = customSubtitleUrlRef.current;
      if (prevUrl) {
        revokeBlob(prevUrl);
        activeBlobUrlsRef.current.delete(prevUrl);
        customSubtitleUrlRef.current = null;
      }

      let url: string;
      try {
        const text = await file.text();
        const vtt = srtToVtt(text);
        const blob = new Blob([vtt], { type: "text/vtt;charset=utf-8" });
        url = URL.createObjectURL(blob);
      } catch {
        url = URL.createObjectURL(file);
      }

      customSubtitleUrlRef.current = url;
      activeBlobUrlsRef.current.add(url);

      const customTrack: SubtitleTrack = {
        id: `custom-${Date.now()}`,
        lang: "custom",
        label: file.name.replace(/\.[^/.]+$/, ""),
        url,
      };

      setAvailableSubtitles((prev) => [
        customTrack,
        ...prev.filter(
          (track) =>
            track.id !== "custom" &&
            !track.id.startsWith("custom-") &&
            track.lang !== "custom" &&
            track.url !== prevUrl
        ),
      ]);
      // Uploading a file implicitly enables subtitles
      subtitlesFetchedRef.current = true;
      setSubtitlesEnabled(true);
      subtitles.selectTrack(customTrack);
    },
    [subtitles]
  );

  const handleSubtitleChange = useCallback(
    (track: SubtitleTrack | null) => {
      subtitles.selectTrack(track);
      if (track) {
        setAvailableSubtitles((prev) => {
          const exists = prev.some((t) => t.id === track.id);
          if (!exists) {
            return [track, ...prev];
          }
          return [track, ...prev.filter((t) => t.id !== track.id)];
        });
      }
    },
    [subtitles]
  );

  const serverOptions = useMemo<ServerOption[]>(() => {
    const list = [...SERVERS];
    for (const src of availableSources) {
      const existingIndex = list.findIndex((server) => server.id === src.id);
      const existingServer = existingIndex >= 0 ? list[existingIndex] : undefined;
      const sourceOption: ServerOption = {
        id: src.id,
        name: src.name,
        description: src.quality ? `${src.quality} stream` : "Direct source",
        kind: src.kind,
        flagUrl: existingServer?.flagUrl,
      };

      if (existingIndex >= 0) {
        list[existingIndex] = sourceOption;
      } else {
        list.push(sourceOption);
      }
    }

    if (activeProviders.length === 0) {
      return list;
    }

    const enabledProviderIds = new Set(activeProviders.map((p) => p.id));
    return list.filter((server) => {
      if (server.id === "default") return true;
      return Array.from(enabledProviderIds).some((provId) =>
        server.id === provId || server.id.startsWith(`${provId}-`)
      );
    });
  }, [availableSources, activeProviders]);

  const filteredServerGroups = useMemo<ServerGroup[]>(() => {
    if (activeProviders.length === 0) {
      return SERVER_GROUPS;
    }
    const enabledProviderIds = new Set(activeProviders.map((p) => p.id));
    const result: ServerGroup[] = SERVER_GROUPS.filter((g) => enabledProviderIds.has(g.id));
    for (const provider of activeProviders) {
      if (!result.some((g) => g.id === provider.id)) {
        result.push({
          id: provider.id,
          name: provider.name,
          children: [],
        });
      }
    }
    return result;
  }, [activeProviders]);

  const isLoading = isResolvingStream && !stream.source;

  const { font: subFont, textSize: subSize, textColor: subColor, backgroundBlur: subBlur } =
    appSettings.subtitles;

  const subtitleColorHex =
    subColor === "yellow"
      ? "#fef08a"
      : subColor === "cyan"
      ? "#67e8f9"
      : subColor === "magenta"
      ? "#f472b6"
      : "#ffffff";

  const subtitleFontFamily =
    subFont === "netflix"
      ? "'Netflix Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif"
      : subFont === "montserrat"
      ? "'Montserrat', sans-serif"
      : "'Inter', system-ui, -apple-system, sans-serif";

  const subtitleFontSize = `${Math.round((subSize / 100) * 24)}px`;
  const subtitleBgColor = subBlur ? "rgba(0, 0, 0, 0.75)" : "transparent";

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black overflow-hidden select-none">
      {/* Subtitle Appearance Dynamic Cue Style */}
      <style jsx global>{`
        video::cue {
          color: ${subtitleColorHex} !important;
          background-color: ${subtitleBgColor} !important;
          font-size: ${subtitleFontSize} !important;
          font-family: ${subtitleFontFamily} !important;
          text-shadow: ${subBlur
            ? "2px 2px 4px rgba(0, 0, 0, 0.9)"
            : "2px 2px 4px rgba(0, 0, 0, 0.9), 0 0 8px rgba(0, 0, 0, 0.8)"} !important;
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

          {/* Double-tap Seek Feedback Indicator */}
          {seekFeedback ? (
            <div
              key={seekFeedback.key}
              className={`pointer-events-none absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center gap-1 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/20 text-white animate-in fade-in zoom-in-75 duration-200 ${
                seekFeedback.side === "left" ? "left-[15%]" : "right-[15%]"
              }`}
            >
              {seekFeedback.side === "left" ? (
                <svg className="w-8 h-8 sm:w-9 sm:h-9" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 sm:w-9 sm:h-9" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                </svg>
              )}
              <span className="text-xs sm:text-sm font-bold tracking-wide">
                {seekFeedback.side === "left" ? `-${seekFeedback.seconds}s` : `+${seekFeedback.seconds}s`}
              </span>
            </div>
          ) : null}

          {/* Top Header Bar */}
          <PlayerHeader
            title={media.title}
            subtitle={computedHeaderSubtitle}
            onBack={onBack}
            visible={controls.areControlsVisible}
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
                    subtitleTracks={availableSubtitles}
                    activeSubtitleId={subtitles.activeTrack?.id}
                    onSubtitleChange={handleSubtitleChange}
                    onUploadSubtitle={handleUploadSubtitle}
                    subtitlesEnabled={subtitlesEnabled}
                    isSubtitlesFetching={isSubtitlesFetching}
                    onToggleSubtitles={handleToggleSubtitles}
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
          {isLoading || playerState.isBuffering ? (
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
              <LoadingSpinner className="[&>svg]:h-7 [&>svg]:w-7" />
            </div>
          ) : null}

          {/* Stream Error Toast */}
          {stream.isError ? (
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
          {isIntroActive ? (
            <PlayerActionButton
              label="Skip Intro"
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
            visible={controls.areControlsVisible}
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
