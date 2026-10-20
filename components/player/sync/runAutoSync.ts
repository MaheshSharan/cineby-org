import type { StreamFormat } from "../types";
import { CaptureError, fetchAndDecodeSegmentAudio } from "@/lib/subtitles/sync/segmentAudio";
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
  headers?: Record<string, string>;
  rawSubtitles: string | null;
  durationSec: number;
  signal: AbortSignal;
  onProgress: (fraction: number) => void;
  onLog?: (message: string) => void;
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
  window: TimeWindow,
  windowIdx: number,
  totalWindows: number
): Promise<WindowResult | null> {
  const winSpan = `${window.start.toFixed(1)}s - ${window.end.toFixed(1)}s (${(window.end - window.start).toFixed(1)}s duration)`;
  input.onLog?.(`[Window ${windowIdx + 1}/${totalWindows}] Selecting dialogue window: ${winSpan}`);

  const audio = await fetchAndDecodeSegmentAudio({
    sourceUrl: input.sourceUrl,
    format: input.format,
    window,
    signal: input.signal,
    headers: input.headers,
    onLog: (msg) => input.onLog?.(`[Window ${windowIdx + 1}/${totalWindows}] ${msg}`),
  });

  input.onProgress((windowIdx + 1) / totalWindows);
  input.onLog?.(`[Window ${windowIdx + 1}/${totalWindows}] Running Butterworth filter (300Hz-3400Hz) & VAD in Web Worker...`);
  const response = await analyze(worker, { id: 0, ...audio, cues });

  const speechPct = (response.speechRatio * 100).toFixed(1);
  input.onLog?.(`[Window ${windowIdx + 1}/${totalWindows}] Voice Activity Detection: ${speechPct}% speech density in window`);

  if (response.speechRatio < MIN_SPEECH_RATIO) {
    input.onLog?.(`[Window ${windowIdx + 1}/${totalWindows}] Speech ratio below threshold (${MIN_SPEECH_RATIO * 100}%). Skipping non-vocal audio.`);
    return null;
  }
  if (!response.match) {
    input.onLog?.(`[Window ${windowIdx + 1}/${totalWindows}] Pearson cross-correlation computed, but no positive alignment peak detected.`);
    return null;
  }

  const { offsetSec, peak, sidelobe, confidence } = response.match;
  const sign = offsetSec >= 0 ? "+" : "";
  input.onLog?.(`[Window ${windowIdx + 1}/${totalWindows}] Correlation peak: ${peak.toFixed(3)}, sidelobe: ${sidelobe.toFixed(3)}, confidence: ${confidence.toFixed(3)}`);
  input.onLog?.(`[Window ${windowIdx + 1}/${totalWindows}] Window result offset: ${sign}${offsetSec.toFixed(3)}s`);

  return { ...response.match, atSec: (window.start + window.end) / 2 };
}

function failed(reason: SyncFailure): AutoSyncResult {
  return { status: "failed", reason };
}

/**
 * Measures how far the active subtitle track is from the audio.
 * Picks dialogue-dense windows from the cue list, fetches audio segments directly,
 * and determines the offset via Pearson cross-correlation.
 */
export async function runAutoSync(input: AutoSyncInput): Promise<AutoSyncResult> {
  const cues = input.rawSubtitles ? parseCues(input.rawSubtitles) : [];
  if (cues.length === 0) return failed("no-subtitles");

  const windows = pickListenWindows(cues, input.durationSec).slice(0, MAX_WINDOWS_TRIED);
  if (windows.length === 0) return failed("no-dialogue");

  const worker = new Worker(new URL("../../../lib/subtitles/sync/analysis.worker.ts", import.meta.url));
  const results: WindowResult[] = [];

  input.onLog?.(`Loaded ${cues.length} subtitle cues. Picked ${windows.length} dialogue candidate window(s).`);

  try {
    for (let i = 0; i < windows.length; i++) {
      const window = windows[i];
      const result = await listenToWindow(input, worker, cues, window, i, windows.length);
      if (result) results.push(result);
      if (result && isConfident(result)) {
        input.onLog?.(`High-confidence match obtained. Halting further window scans.`);
        break;
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    input.onLog?.(`[Error] Capture failure: ${errorMsg}`);
    if (error instanceof CaptureError) return failed(error.reason);
    return failed("unreadable");
  } finally {
    worker.terminate();
  }

  const outcome = combineMatches(results);
  if (outcome.kind === "shift") {
    const sign = outcome.offsetSec >= 0 ? "+" : "";
    if (Math.abs(outcome.offsetSec) < 0.1) {
      input.onLog?.(`Subtitles are already in sync (offset: ${sign}${outcome.offsetSec.toFixed(3)}s within ±0.1s tolerance).`);
    } else {
      input.onLog?.(`Sync succeeded! Recommended offset: ${sign}${outcome.offsetSec.toFixed(3)}s (confidence=${outcome.confidence.toFixed(2)})`);
    }
    return { status: "ok", offsetSec: outcome.offsetSec, confidence: outcome.confidence };
  }
  input.onLog?.(`Sync ended with outcome: ${outcome.kind}`);
  return failed(outcome.kind);
}
