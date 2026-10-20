import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import type { StreamFormat } from "../types";
import { runAutoSync, type SyncFailure } from "../sync/runAutoSync";

export type SubtitleSyncState =
  | { phase: "idle" }
  | { phase: "listening"; progress: number }
  | { phase: "ready"; offsetSec: number }
  | { phase: "failed"; reason: SyncFailure };

interface UseSubtitleSyncOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  sourceUrl?: string | null;
  format?: StreamFormat;
  /** Settings toggle; when off the feature is hidden entirely. */
  enabled: boolean;
  /** Identity of the active track, so a change cancels an in-flight run. */
  trackId?: string;
  getRawSubtitles: () => string | null;
  /** Profile-wide delay already applied on top of the track offset. */
  globalDelaySec: number;
  setTrackOffset: (offsetSec: number) => void;
}

/** Safari is not supported yet: its audio capture from media elements is unreliable. */
function isSyncSupported(): boolean {
  if (typeof window === "undefined" || typeof AudioWorkletNode === "undefined") return false;
  return !/^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
}

export function useSubtitleSync({
  videoRef,
  sourceUrl,
  format,
  enabled,
  trackId,
  getRawSubtitles,
  globalDelaySec,
  setTrackOffset,
}: UseSubtitleSyncOptions) {
  const [state, setState] = useState<SubtitleSyncState>({ phase: "idle" });
  const controllerRef = useRef<AbortController | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(isSyncSupported());
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState({ phase: "idle" });
  }, []);

  // A new track or source makes any run in flight meaningless.
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
      setState({ phase: "idle" });
    };
  }, [trackId, sourceUrl]);

  const start = useCallback(async () => {
    const duration = videoRef.current?.duration;
    if (!sourceUrl || !duration || !Number.isFinite(duration)) {
      setState({ phase: "failed", reason: "unreadable" });
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ phase: "listening", progress: 0 });

    const result = await runAutoSync({
      sourceUrl,
      format: format ?? "unknown",
      rawSubtitles: getRawSubtitles(),
      durationSec: duration,
      signal: controller.signal,
      onProgress: (progress) => {
        if (!controller.signal.aborted) setState({ phase: "listening", progress });
      },
    });

    if (controller.signal.aborted) return;
    controllerRef.current = null;
    setState(
      result.status === "ok"
        ? { phase: "ready", offsetSec: result.offsetSec }
        : { phase: "failed", reason: result.reason }
    );
  }, [videoRef, sourceUrl, format, getRawSubtitles]);

  const apply = useCallback(() => {
    if (state.phase !== "ready") return;
    // The measured offset is the total shift needed; the profile delay is already part of it.
    setTrackOffset(state.offsetSec - globalDelaySec);
    setState({ phase: "idle" });
  }, [state, globalDelaySec, setTrackOffset]);

  return { state, supported: enabled && supported, start, cancel, apply, dismiss: cancel };
}
