import { CAPTURE_PROCESSOR_NAME, CAPTURE_WORKLET_SOURCE } from "./captureWorklet";
import type { TimeWindow } from "./types";

/** Share of the timing samples, from the fastest, used to estimate the clock offset. */
const LATENCY_PERCENTILE = 0.1;
const START_TIMEOUT_MS = 20000;
const PLAYBACK_SLACK_MS = 15000;

export type CaptureFailure = "unreadable" | "stalled" | "cancelled";

export class CaptureError extends Error {
  constructor(readonly reason: CaptureFailure) {
    super(reason);
  }
}

export interface CapturedAudio {
  samples: Float32Array;
  sampleRate: number;
  /** Video time of samples[0], in seconds. */
  windowStart: number;
}

interface Chunk {
  frame: number;
  samples: Float32Array;
}

interface CaptureMessage {
  data: Chunk;
}

function waitForEvent(target: EventTarget, name: string, signal: AbortSignal, failOn?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(name, onDone);
      if (failOn) target.removeEventListener(failOn, onFail);
      signal.removeEventListener("abort", onAbort);
    };
    const onDone = () => (cleanup(), resolve());
    const onFail = () => (cleanup(), reject(new CaptureError("unreadable")));
    const onAbort = () => (cleanup(), reject(new CaptureError("cancelled")));

    if (signal.aborted) return onAbort();
    target.addEventListener(name, onDone, { once: true });
    if (failOn) target.addEventListener(failOn, onFail, { once: true });
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Chunk delivery lags the video clock by a small, jittery delay. The fastest
 * deliveries are the least delayed, so a low percentile of the (video time -
 * audio time) pairs is the best estimate of the true clock offset.
 */
function estimateClockOffset(pairs: number[]): number {
  const sorted = [...pairs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * LATENCY_PERCENTILE)];
}

function joinChunks(chunks: Chunk[]): Float32Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.samples.length, 0);
  const joined = new Float32Array(total);
  let at = 0;
  for (const chunk of chunks) {
    joined.set(chunk.samples, at);
    at += chunk.samples.length;
  }
  return joined;
}

/**
 * Plays `window` of a hidden probe video and records its audio.
 * The probe is a separate element from the one the viewer is watching, and
 * its audio goes only to the analyser, never to the speakers.
 * The AudioContext is created before any await so the click that started
 * the sync still counts as a user gesture.
 */
export async function captureAudio(
  probe: HTMLVideoElement,
  window: TimeWindow,
  signal: AbortSignal,
  onProgress?: (fraction: number) => void
): Promise<CapturedAudio> {
  const context = new AudioContext();
  const blobUrl = URL.createObjectURL(new Blob([CAPTURE_WORKLET_SOURCE], { type: "text/javascript" }));
  const chunks: Chunk[] = [];
  const clockPairs: number[] = [];
  let recording = false;
  let stalled = false;

  const onWaiting = () => {
    if (recording) stalled = true;
  };
  probe.addEventListener("waiting", onWaiting);

  try {
    await context.audioWorklet.addModule(blobUrl);
    const source = context.createMediaElementSource(probe);
    const worklet = new AudioWorkletNode(context, CAPTURE_PROCESSOR_NAME);
    const mute = context.createGain();
    mute.gain.value = 0;
    // The worklet is only pulled when it reaches the destination, so route it through a silent gain.
    source.connect(worklet).connect(mute).connect(context.destination);

    worklet.port.onmessage = ({ data }: CaptureMessage) => {
      if (!recording) return;
      chunks.push(data);
      clockPairs.push(probe.currentTime - data.frame / context.sampleRate);
    };

    if (probe.readyState < HTMLMediaElement.HAVE_METADATA) await waitForEvent(probe, "loadedmetadata", signal, "error");
    probe.currentTime = window.start;
    await waitForEvent(probe, "seeked", signal, "error");
    await context.resume();

    await probe.play();
    recording = true;

    const deadline = Date.now() + (window.end - window.start) * 1000 + PLAYBACK_SLACK_MS;
    const startedBy = Date.now() + START_TIMEOUT_MS;
    while (probe.currentTime < window.end) {
      if (signal.aborted) throw new CaptureError("cancelled");
      if (stalled || Date.now() > deadline) throw new CaptureError("stalled");
      if (chunks.length === 0 && Date.now() > startedBy) throw new CaptureError("unreadable");
      onProgress?.(Math.min(1, (probe.currentTime - window.start) / (window.end - window.start)));
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    recording = false;
    probe.pause();

    if (chunks.length === 0) throw new CaptureError("unreadable");
    return {
      samples: joinChunks(chunks),
      sampleRate: context.sampleRate,
      windowStart: estimateClockOffset(clockPairs) + chunks[0].frame / context.sampleRate,
    };
  } catch (error) {
    if (error instanceof CaptureError) throw error;
    throw new CaptureError(signal.aborted ? "cancelled" : "unreadable");
  } finally {
    recording = false;
    probe.removeEventListener("waiting", onWaiting);
    URL.revokeObjectURL(blobUrl);
    void context.close();
  }
}
