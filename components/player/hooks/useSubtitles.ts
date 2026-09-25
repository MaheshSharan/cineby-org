import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SubtitleTrack } from "../types";
import { srtToVtt } from "@/lib/utils/srtToVtt";
import { revokeBlob, revokeAllBlobs } from "../utils/blobPool";

export interface SubtitleStyleSettings {
  font?: string;
  textSize?: number;
  textColor?: string;
  backgroundBlur?: boolean;
}

export interface UseSubtitlesOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  mediaId?: number;
  mediaType?: "movie" | "tv";
  currentSeason?: number;
  currentEpisode?: number;
  isTv?: boolean;
  activeServerId?: string;
  sourceUrl?: string | null;
  autoSubtitles?: boolean;
  preferredLanguage?: string;
  subtitlesSettings?: SubtitleStyleSettings;
}

export interface UseSubtitlesResult {
  activeTrack: SubtitleTrack | null;
  availableSubtitles: SubtitleTrack[];
  subtitlesEnabled: boolean;
  isSubtitlesFetching: boolean;
  activeLabel: string;
  selectTrack: (track: SubtitleTrack | null) => void;
  handleToggleSubtitles: () => void;
  fetchSubtitles: (targetLang?: string) => void;
  handleUploadSubtitle: (file: File) => Promise<void>;
  handleSubtitleChange: (track: SubtitleTrack | null) => void;
  subtitleStyles: {
    color: string;
    backgroundColor: string;
    fontSize: string;
    fontFamily: string;
    textShadow: string;
  };
}

function getActiveLabel(track: SubtitleTrack | null): string {
  if (!track) {
    return "Off";
  }

  return track.label || track.lang || "Unknown";
}

export function useSubtitles({
  videoRef,
  mediaId,
  mediaType,
  currentSeason,
  currentEpisode,
  isTv,
  activeServerId = "default",
  sourceUrl,
  autoSubtitles = false,
  preferredLanguage = "en",
  subtitlesSettings,
}: UseSubtitlesOptions): UseSubtitlesResult {
  const [activeTrack, setActiveTrack] = useState<SubtitleTrack | null>(null);
  const [availableSubtitles, setAvailableSubtitles] = useState<SubtitleTrack[]>([]);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [isSubtitlesFetching, setIsSubtitlesFetching] = useState(false);

  const activeBlobUrlRef = useRef<string | null>(null);
  const customSubtitleUrlRef = useRef<string | null>(null);
  const activeBlobUrlsRef = useRef<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const subtitleFetchControllerRef = useRef<AbortController | null>(null);
  const subtitlesFetchedRef = useRef(false);

  const currentMediaKey = `${mediaType ?? "movie"}-${mediaId ?? 0}-${isTv ? currentSeason ?? 0 : 0}-${isTv ? currentEpisode ?? 0 : 0}`;
  const prevMediaKeyRef = useRef(currentMediaKey);

  // Cleanup on unmount
  useEffect(() => {
    const activeBlobUrls = activeBlobUrlsRef.current;
    return () => {
      abortControllerRef.current?.abort();
      subtitleFetchControllerRef.current?.abort();

      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }

      revokeAllBlobs();
      activeBlobUrls.forEach((url) => {
        revokeBlob(url);
      });
      activeBlobUrls.clear();
      customSubtitleUrlRef.current = null;
    };
  }, []);

  const selectTrack = useCallback(
    (track: SubtitleTrack | null) => {
      const video = videoRef.current;

      // Abort any ongoing subtitle download
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Revoke prior active blob URL if any
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }

      // Disable existing text tracks and remove <track> elements
      if (video) {
        Array.from(video.textTracks).forEach((textTrack) => {
          textTrack.mode = "disabled";
        });
        const existing = video.querySelectorAll("track");
        existing.forEach((el) => el.remove());
      }

      if (!track?.url) {
        setActiveTrack(null);
        return;
      }

      setActiveTrack(track);

      // If the URL is already a blob URL (e.g. from local file upload), use directly
      if (track.url.startsWith("blob:")) {
        if (!video) return;

        const element = document.createElement("track");
        element.kind = "subtitles";
        element.label = track.label;
        element.srclang = track.lang;
        element.src = track.url;
        element.default = true;

        element.addEventListener("load", () => {
          if (element.track) {
            element.track.mode = "showing";
          }
        });

        video.appendChild(element);
        if (element.track) {
          element.track.mode = "showing";
        }
        return;
      }

      // Otherwise fetch subtitle content, convert to standard WebVTT, and create a same-origin Blob URL
      const controller = new AbortController();
      abortControllerRef.current = controller;

      fetch(track.url, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`Subtitle HTTP error: ${res.status}`);
          return res.text();
        })
        .then((rawContent) => {
          if (controller.signal.aborted) return;
          const currentVideo = videoRef.current;
          if (!currentVideo) return;

          const vttContent = srtToVtt(rawContent);
          const blob = new Blob([vttContent], { type: "text/vtt;charset=utf-8" });
          const blobUrl = URL.createObjectURL(blob);
          activeBlobUrlRef.current = blobUrl;

          // Remove old tracks before appending new one
          const oldTracks = currentVideo.querySelectorAll("track");
          oldTracks.forEach((el) => el.remove());

          const element = document.createElement("track");
          element.kind = "subtitles";
          element.label = track.label;
          element.srclang = track.lang;
          element.src = blobUrl;
          element.default = true;

          element.addEventListener("load", () => {
            if (element.track) {
              element.track.mode = "showing";
            }
          });

          element.addEventListener("error", () => {
            // Subtitle failed to load; silent fallback
          });

          currentVideo.appendChild(element);

          if (element.track) {
            element.track.mode = "showing";
          }
        })
        .catch(() => {
          // Silent fallback on abort or network error
        });
    },
    [videoRef]
  );

  // Reset subtitle state when navigating to a new media (episode/movie change)
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
    selectTrack(null);
  }, [currentMediaKey, selectTrack]);

  const fetchSubtitles = useCallback(
    (targetLang: string = preferredLanguage || "en") => {
      if (!mediaId || subtitlesFetchedRef.current) {
        return;
      }

      subtitlesFetchedRef.current = true;
      setIsSubtitlesFetching(true);

      const controller = new AbortController();
      subtitleFetchControllerRef.current = controller;

      const params = new URLSearchParams({
        tmdbId: mediaId.toString(),
        type: mediaType ?? "movie",
        server: activeServerId,
      });
      if (isTv && currentSeason !== undefined && currentEpisode !== undefined) {
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
              selectTrack(preferredTrack);
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
    [activeServerId, currentEpisode, currentSeason, isTv, mediaId, mediaType, preferredLanguage, selectTrack]
  );

  const handleToggleSubtitles = useCallback(() => {
    setSubtitlesEnabled((enabled) => {
      const nextEnabled = !enabled;

      if (!nextEnabled) {
        selectTrack(null);
        return false;
      }

      if (subtitlesFetchedRef.current) {
        if (!activeTrack && availableSubtitles.length > 0) {
          selectTrack(availableSubtitles[0]);
        }
        return true;
      }

      fetchSubtitles();
      return true;
    });
  }, [activeTrack, availableSubtitles, fetchSubtitles, selectTrack]);

  // Auto-fetch & select subtitles when autoSubtitles setting is enabled
  useEffect(() => {
    if (!autoSubtitles || !sourceUrl) {
      return;
    }

    if (!subtitlesFetchedRef.current) {
      fetchSubtitles(preferredLanguage || "en");
    }
  }, [autoSubtitles, fetchSubtitles, preferredLanguage, sourceUrl]);

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
      selectTrack(customTrack);
    },
    [selectTrack]
  );

  const handleSubtitleChange = useCallback(
    (track: SubtitleTrack | null) => {
      selectTrack(track);
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
    [selectTrack]
  );

  const activeLabel = useMemo(() => getActiveLabel(activeTrack), [activeTrack]);

  const subtitleStyles = useMemo(() => {
    const subColor = subtitlesSettings?.textColor ?? "white";
    const subFont = subtitlesSettings?.font ?? "inter";
    const subSize = subtitlesSettings?.textSize ?? 100;
    const subBlur = subtitlesSettings?.backgroundBlur ?? false;

    const color =
      subColor === "yellow"
        ? "#fef08a"
        : subColor === "cyan"
        ? "#67e8f9"
        : subColor === "magenta"
        ? "#f472b6"
        : "#ffffff";

    const fontFamily =
      subFont === "netflix"
        ? "'Netflix Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif"
        : subFont === "montserrat"
        ? "'Montserrat', sans-serif"
        : "'Inter', system-ui, -apple-system, sans-serif";

    const fontSize = `${Math.round((subSize / 100) * 24)}px`;
    const backgroundColor = subBlur ? "rgba(0, 0, 0, 0.75)" : "transparent";
    const textShadow = subBlur
      ? "2px 2px 4px rgba(0, 0, 0, 0.9)"
      : "2px 2px 4px rgba(0, 0, 0, 0.9), 0 0 8px rgba(0, 0, 0, 0.8)";

    return {
      color,
      fontFamily,
      fontSize,
      backgroundColor,
      textShadow,
    };
  }, [subtitlesSettings]);

  return {
    activeTrack,
    availableSubtitles,
    subtitlesEnabled,
    isSubtitlesFetching,
    activeLabel,
    selectTrack,
    handleToggleSubtitles,
    fetchSubtitles,
    handleUploadSubtitle,
    handleSubtitleChange,
    subtitleStyles,
  };
}
