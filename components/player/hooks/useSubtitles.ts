import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SubtitleTrack } from "../types";
import { srtToVtt } from "@/lib/utils/srtToVtt";

interface UseSubtitlesOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export interface UseSubtitlesResult {
  activeTrack: SubtitleTrack | null;
  selectTrack: (track: SubtitleTrack | null) => void;
  activeLabel: string;
}

function getActiveLabel(track: SubtitleTrack | null): string {
  if (!track) {
    return "Off";
  }

  return track.label || track.lang || "Unknown";
}

export function useSubtitles({ videoRef }: UseSubtitlesOptions): UseSubtitlesResult {
  const [activeTrack, setActiveTrack] = useState<SubtitleTrack | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup active blob URL on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
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

  const activeLabel = useMemo(() => getActiveLabel(activeTrack), [activeTrack]);

  return { activeTrack, selectTrack, activeLabel };
}
