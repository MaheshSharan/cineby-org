import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MediaSource, PlayerMedia, ServerGroup, ServerOption } from "../types";
import { SERVERS, SERVER_GROUPS } from "../constants";
import { resolveStream } from "../providers";
import { getMediaKey } from "@/lib/utils/media";
import { fetchActiveProviders, seedActiveProviders, type ActiveProvider } from "../providers/activeProviders";

export interface StreamState {
  source: MediaSource | null;
  isError: boolean;
}

export interface UsePlayerSourceOptions {
  media: PlayerMedia;
  currentSeason?: number;
  currentEpisode?: number;
  isTv: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export interface UsePlayerSourceResult {
  stream: StreamState;
  isResolvingStream: boolean;
  activeServerId: string;
  pendingServerId: string | null;
  failedServerIds: Record<string, boolean>;
  serverOptions: ServerOption[];
  filteredServerGroups: ServerGroup[];
  availableSources: MediaSource[];
  resumeTime: number;
  handleServerChange: (serverId: string) => void;
  triggerServerFailure: (failedServerId: string, fallbackServerId: string, resumeTime: number) => void;
  handlePlaybackFailure: () => void;
  setStream: React.Dispatch<React.SetStateAction<StreamState>>;
  loadStream: (serverId: string, options?: { forcedTime?: number; fallbackServerId?: string; isFallback?: boolean }) => Promise<void>;
  markServerSuccess: (serverId: string) => void;
}

export function usePlayerSource({
  media,
  currentSeason = 1,
  currentEpisode = 1,
  isTv,
  videoRef,
}: UsePlayerSourceOptions): UsePlayerSourceResult {
  const [stream, setStream] = useState<StreamState>({ source: null, isError: false });
  const [isResolvingStream, setIsResolvingStream] = useState(true);
  const [activeServerId, setActiveServerId] = useState<string>("default");
  const [pendingServerId, setPendingServerId] = useState<string | null>(null);
  const [failedServerIds, setFailedServerIds] = useState<Record<string, boolean>>({});
  const [availableSources, setAvailableSources] = useState<MediaSource[]>([]);
  const [activeProviders, setActiveProviders] = useState<ActiveProvider[]>(() => {
    if (media.activeProviders && media.activeProviders.length > 0) {
      seedActiveProviders(media.activeProviders);
      return media.activeProviders;
    }
    return [];
  });
  const [resumeTime, setResumeTime] = useState(0);

  const failedTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastWorkingServerIdRef = useRef<string>("default");
  const streamRequestControllerRef = useRef<AbortController | null>(null);
  const pendingStreamAbortRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const currentMediaKey = getMediaKey(media.mediaType, media.mediaId, currentSeason, currentEpisode);
  const lastMediaKeyRef = useRef<string>(currentMediaKey);


  // Fetch enabled providers dynamically if not baked from SSR
  useEffect(() => {
    if (media.activeProviders && media.activeProviders.length > 0) {
      seedActiveProviders(media.activeProviders);
      setActiveProviders(media.activeProviders);
      return;
    }

    let isCurrent = true;
    fetchActiveProviders()
      .then((providers) => {
        if (isCurrent) setActiveProviders(providers);
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [media.activeProviders]);

  const triggerServerFailure = useCallback(
    (failedServerId: string, fallbackServerId: string, fallbackTime: number) => {
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
        void loadStreamRef.current(fallbackServerId, { forcedTime: fallbackTime, isFallback: true });
      } else {
        setStream({ source: null, isError: true });
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
      const isSameMedia = lastMediaKeyRef.current === currentMediaKey;
      lastMediaKeyRef.current = currentMediaKey;

      const previousTime =
        typeof options?.forcedTime === "number"
          ? options.forcedTime
          : isSameMedia && element && element.currentTime > 0
          ? element.currentTime
          : 0;

      setResumeTime(previousTime);

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

      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        return;
      }
      setIsResolvingStream(false);

      const source = result?.source ?? null;

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

      if (source?.id) {
        setActiveServerId(source.id);
        lastWorkingServerIdRef.current = source.id;
      }

      setStream({ source, isError: false });
    },
    [currentEpisode, currentMediaKey, currentSeason, isTv, media.mediaId, media.mediaType, triggerServerFailure, videoRef]
  );

  const loadStreamRef = useRef(loadStream);
  loadStreamRef.current = loadStream;

  const markServerSuccess = useCallback((serverId: string) => {
    setPendingServerId(null);
    setActiveServerId(serverId);
    lastWorkingServerIdRef.current = serverId;
  }, []);

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
    [activeServerId, loadStream, pendingServerId, videoRef]
  );

  const handlePlaybackFailure = useCallback(() => {
    const failedServerId = pendingServerId || stream.source?.id || activeServerId;
    const fallbackServerId =
      lastWorkingServerIdRef.current && lastWorkingServerIdRef.current !== failedServerId
        ? lastWorkingServerIdRef.current
        : "";
    const currentTime = videoRef.current?.currentTime ?? 0;
    triggerServerFailure(failedServerId, fallbackServerId, currentTime);
  }, [activeServerId, pendingServerId, stream.source?.id, triggerServerFailure, videoRef]);

  // StrictMode & unmount handling for in-flight streams
  useEffect(() => {
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
      if (!controller) return;
      pendingStreamAbortRef.current = setTimeout(() => {
        controller.abort();
        if (streamRequestControllerRef.current === controller) {
          streamRequestControllerRef.current = null;
        }
        pendingStreamAbortRef.current = null;
      }, 0);
    };

    const handleBeforeUnload = () => {
      abortStreamSync();
    };

    const failedTimers = failedTimersRef.current;
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      scheduleStreamAbort();
      for (const timer of failedTimers.values()) {
        clearTimeout(timer);
      }
      failedTimers.clear();
    };
  }, []);

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
      const existing = result.find((g) => g.id === provider.id);
      if (existing) {
        if ((!existing.children || existing.children.length === 0) && provider.children && provider.children.length > 0) {
          existing.children = provider.children;
        }
      } else {
        result.push({
          id: provider.id,
          name: provider.name,
          children: provider.children ?? [],
        });
      }
    }
    return result;
  }, [activeProviders]);

  return {
    stream,
    isResolvingStream,
    activeServerId,
    pendingServerId,
    failedServerIds,
    serverOptions,
    filteredServerGroups,
    availableSources,
    resumeTime,
    handleServerChange,
    triggerServerFailure,
    handlePlaybackFailure,
    setStream,
    loadStream,
    markServerSuccess,
  };
}
