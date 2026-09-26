import { useEffect, useRef, useState } from "react";

import type { MediaSource, PlayerSettings } from "../types";
import { createMediaEngine, type MediaEngine } from "../media";
import type { SegmentByteCache } from "@/lib/player/media/segmentByteCache";
import { normalizeResolutionToQuality } from "../utils/resolution";

export function detectFormat(url: string): MediaSource["format"] {
  const lower = url.toLowerCase();
  if (lower.includes(".m3u8")) return "hls";
  if (lower.includes(".mpd")) return "dash";
  if (lower.includes(".mp4")) return "mp4";
  if (lower.includes(".webm")) return "webm";
  if (lower.includes(".mkv")) return "mkv";
  return "unknown";
}

export interface UseHlsPlaybackOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  source: MediaSource | null;
  mediaKey: string;
  cache?: SegmentByteCache;
  quality: PlayerSettings["quality"];
  resumeTime?: number;
  onPlaybackSuccess?: () => void;
  onPlaybackFailure?: () => void;
}

export interface UseHlsPlaybackResult {
  activeAbrLevel: string | null;
  mediaEngineRef: React.MutableRefObject<MediaEngine | null>;
  destroyEngine: () => void;
}

export function useHlsPlayback({
  videoRef,
  source,
  mediaKey,
  cache,
  quality,
  resumeTime = 0,
  onPlaybackSuccess,
  onPlaybackFailure,
}: UseHlsPlaybackOptions): UseHlsPlaybackResult {
  const mediaEngineRef = useRef<MediaEngine | null>(null);
  const [activeAbrLevel, setActiveAbrLevel] = useState<string | null>(null);

  // Dynamic quality level switching
  useEffect(() => {
    if (mediaEngineRef.current && "setQuality" in mediaEngineRef.current) {
      mediaEngineRef.current.setQuality(quality);
    }
  }, [quality]);

  const destroyEngine = () => {
    if (mediaEngineRef.current) {
      mediaEngineRef.current.destroy();
      mediaEngineRef.current = null;
    }
    setActiveAbrLevel(null);
  };

  // Mount/attach media engine when source changes
  useEffect(() => {
    const element = videoRef.current;
    if (!element || !source?.url) {
      return;
    }

    destroyEngine();

    const format = source.format === "unknown" ? detectFormat(source.url) : source.format;
    let hasCommitted = false;

    const commitSuccess = () => {
      if (hasCommitted) return;
      hasCommitted = true;
      onPlaybackSuccess?.();
    };

    const handleFailure = () => {
      if (hasCommitted) return;
      hasCommitted = true;
      onPlaybackFailure?.();
    };

    const engine = createMediaEngine(element, source.url, format, {
      onLevelSwitched: (levelHeight, levelWidth) => {
        const normalized = normalizeResolutionToQuality(levelHeight, levelWidth);
        setActiveAbrLevel(normalized);
      },
      onError: () => {
        handleFailure();
      },
      cache,
      mediaKey,
    });
    mediaEngineRef.current = engine;

    if (resumeTime > 0) {
      const restoreTime = () => {
        try {
          if (element.duration && resumeTime < element.duration) {
            element.currentTime = resumeTime;
          } else if (!element.duration) {
            element.currentTime = resumeTime;
          }
        } catch {
          // Ignore seek errors during initial load
        }
      };

      if (element.readyState >= 1) {
        restoreTime();
      } else {
        element.addEventListener("loadedmetadata", restoreTime, { once: true });
      }
    }

    const onCanPlay = () => {
      commitSuccess();
      element.removeEventListener("canplay", onCanPlay);
      element.removeEventListener("error", onError);
    };

    const onError = () => {
      handleFailure();
      element.removeEventListener("canplay", onCanPlay);
      element.removeEventListener("error", onError);
    };

    element.addEventListener("canplay", onCanPlay, { once: true });
    element.addEventListener("error", onError, { once: true });

    void element.play().catch(() => {});

    return () => {
      element.removeEventListener("canplay", onCanPlay);
      element.removeEventListener("error", onError);
      destroyEngine();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.url, mediaKey]);

  return {
    activeAbrLevel,
    mediaEngineRef,
    destroyEngine,
  };
}
