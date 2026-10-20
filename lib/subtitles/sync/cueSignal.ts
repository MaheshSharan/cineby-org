import { FRAME_SEC, type SubtitleCue } from "./types";

/**
 * Renders cues as a 0/1 signal at FRAME_SEC resolution, covering
 * [fromSec, fromSec + frameCount * FRAME_SEC) on the subtitle timeline.
 * Cue text only matters for the anchor picker, not for the signal.
 */
export function buildCueSignal(cues: readonly SubtitleCue[], fromSec: number, frameCount: number): Uint8Array {
  const signal = new Uint8Array(frameCount);
  const toSec = fromSec + frameCount * FRAME_SEC;

  for (const cue of cues) {
    if (cue.end <= fromSec) continue;
    if (cue.start >= toSec) break;

    const first = Math.max(0, Math.round((cue.start - fromSec) / FRAME_SEC));
    const last = Math.min(frameCount, Math.round((cue.end - fromSec) / FRAME_SEC));
    signal.fill(1, first, last);
  }

  return signal;
}
