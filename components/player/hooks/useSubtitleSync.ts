import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import type { StreamFormat } from "../types";
import { runAutoSync, type SyncFailure } from "../sync/runAutoSync";

export type SubtitleSyncState =
  | { phase: "idle" }
  | { phase: "listening"; progress: number }
  | { phase: "ready"; offsetSec: number }
  | { phase: "applied"; offsetSec: number }
  | { phase: "failed"; reason: SyncFailure };

interface UseSubtitleSyncOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  sourceUrl?: string | null;
  format?: StreamFormat;
  headers?: Record<string, string>;
  /** Settings toggle; when off the feature is hidden entirely. */
  enabled: boolean;
  /** Identity of the active track, so a change cancels an in-flight run. */
  trackId?: string;
  getRawSubtitles: () => string | null;
  /** Profile-wide delay already applied on top of the track offset. */
  globalDelaySec: number;
  setTrackOffset: (offsetSec: number) => void;
}

function isSyncSupported(): boolean {
  if (typeof window === "undefined") return false;
  return typeof AudioContext !== "undefined" || typeof (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext !== "undefined";
}

export function useSubtitleSync({
  videoRef,
  sourceUrl,
  format,
  headers,
  enabled,
  trackId,
  getRawSubtitles,
  globalDelaySec,
  setTrackOffset,
}: UseSubtitleSyncOptions) {
  const [state, setState] = useState<SubtitleSyncState>({ phase: "idle" });
  const [logs, setLogs] = useState<string[]>([]);
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
    setLogs([`Starting auto-sync at ${new Date().toLocaleTimeString()}...`]);
    setState({ phase: "listening", progress: 0 });

    const result = await runAutoSync({
      sourceUrl,
      format: format ?? "unknown",
      headers,
      rawSubtitles: getRawSubtitles(),
      durationSec: duration,
      signal: controller.signal,
      onProgress: (progress) => {
        if (!controller.signal.aborted) setState({ phase: "listening", progress });
      },
      onLog: (msg) => {
        if (!controller.signal.aborted) {
          setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
        }
      },
    });

    if (controller.signal.aborted) return;
    controllerRef.current = null;
    setState(
      result.status === "ok"
        ? { phase: "ready", offsetSec: result.offsetSec }
        : { phase: "failed", reason: result.reason }
    );
  }, [videoRef, sourceUrl, format, headers, getRawSubtitles]);

  const apply = useCallback(() => {
    if (state.phase !== "ready") return;
    const offset = state.offsetSec;
    const sign = offset >= 0 ? "+" : "";
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Applying offset fix: ${sign}${offset.toFixed(3)}s...`,
    ]);
    // The measured offset is the total shift needed; the profile delay is already part of it.
    setTrackOffset(offset - globalDelaySec);
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Offset applied successfully! Subtitle timing synchronized.`,
    ]);
    setState({ phase: "applied", offsetSec: offset });
  }, [state, globalDelaySec, setTrackOffset]);

  return { state, logs, clearLogs: () => setLogs([]), supported: enabled && supported, start, cancel, apply, dismiss: cancel };
}
