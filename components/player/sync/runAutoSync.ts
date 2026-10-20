import { createMediaEngine, type MediaEngine } from "../media";
import type { StreamFormat } from "../types";
import { CaptureError, captureAudio } from "@/lib/subtitles/sync/captureAudio";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/subtitles/sync/analysisProtocol";
import { combineMatches, type WindowResult } from "@/lib/subtitles/sync/combineMatches";
import { isConfident } from "@/lib/subtitles/sync/correlate";
import { parseCues } from "@/lib/subtitles/sync/parseCues";
import { pickListenWindows } from "@/lib/subtitles/sync/pickWindows";
import type { SubtitleCue, TimeWindow } from "@/lib/subtitles/sync/types";

/** Below this share of speech frames the audio is treated as unreadable or music-only. */
const MIN_SPEECH_RATIO = 0.03;
/** A second window is tried only when the first is not convincing. */
const MAX_WINDOWS_TRIED = 2;

export type SyncFailure =
  | "no-subtitles"
  | "no-dialogue"
  | "unreadable"
  | "stalled"
  | "no-match"
  | "inconsistent"
  | "cancelled";

export type AutoSyncResult =
  | { status: "ok"; offsetSec: number; confidence: number }
  | { status: "failed"; reason: SyncFailure };

export interface AutoSyncInput {
  sourceUrl: string;
  format: StreamFormat;
  rawSubtitles: string | null;
  durationSec: number;
  signal: AbortSignal;
  onProgress: (fraction: number) => void;
}

function createProbe(): HTMLVideoElement {
  const probe = document.createElement("video");
  probe.playsInline = true;
  probe.preload = "auto";
  probe.style.display = "none";
  return probe;
}

function analyze(worker: Worker, request: AnalyzeRequest): Promise<AnalyzeResponse> {
  return new Promise((resolve, reject) => {
    worker.onmessage = ({ data }: MessageEvent<AnalyzeResponse>) => resolve(data);
    worker.onerror = () => reject(new CaptureError("unreadable"));
    worker.postMessage(request, [request.samples.buffer]);
  });
}

async function listenToWindow(
  input: AutoSyncInput,
  worker: Worker,
  cues: SubtitleCue[],
  window: TimeWindow
): Promise<WindowResult | null> {
  const probe = createProbe();
  let engine: MediaEngine | null = null;
  try {
    engine = createMediaEngine(probe, input.sourceUrl, input.format);
    const audio = await captureAudio(probe, window, input.signal, input.onProgress);
    const response = await analyze(worker, { id: 0, ...audio, cues });

    if (response.speechRatio < MIN_SPEECH_RATIO) throw new CaptureError("unreadable");
    if (!response.match) return null;
    return { ...response.match, atSec: (window.start + window.end) / 2 };
  } finally {
    engine?.destroy();
    probe.removeAttribute("src");
    probe.load();
  }
}

function failed(reason: SyncFailure): AutoSyncResult {
  return { status: "failed", reason };
}

/**
 * Measures how far the active subtitle track is from the audio.
 * Picks dialogue-dense windows from the cue list, listens to each (at most
 * 30 s), and stops as soon as one match is confident.
 */
export async function runAutoSync(input: AutoSyncInput): Promise<AutoSyncResult> {
  const cues = input.rawSubtitles ? parseCues(input.rawSubtitles) : [];
  if (cues.length === 0) return failed("no-subtitles");

  const windows = pickListenWindows(cues, input.durationSec).slice(0, MAX_WINDOWS_TRIED);
  if (windows.length === 0) return failed("no-dialogue");

  const worker = new Worker(new URL("../../../lib/subtitles/sync/analysis.worker.ts", import.meta.url));
  const results: WindowResult[] = [];

  try {
    for (const window of windows) {
      const result = await listenToWindow(input, worker, cues, window);
      if (result) results.push(result);
      if (result && isConfident(result)) break;
    }
  } catch (error) {
    if (error instanceof CaptureError) return failed(error.reason);
    return failed("unreadable");
  } finally {
    worker.terminate();
  }

  const outcome = combineMatches(results);
  if (outcome.kind === "shift") return { status: "ok", offsetSec: outcome.offsetSec, confidence: outcome.confidence };
  return failed(outcome.kind);
}
