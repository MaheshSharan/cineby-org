import { buildCueSignal } from "./cueSignal";
import { FRAME_SEC, type SubtitleCue, type WindowMatch } from "./types";

export const MAX_SHIFT_SEC = 60;
export const MIN_PEAK = 0.25;
export const MIN_CONFIDENCE = 0.08;
const PEAK_EXCLUSION_SEC = 0.5;

function prefixSums(signal: Uint8Array): { sum: Float64Array } {
  const sum = new Float64Array(signal.length + 1);
  for (let i = 0; i < signal.length; i++) sum[i + 1] = sum[i] + signal[i];
  return { sum };
}

/**
 * Pearson correlation between the audio speech frames and the cue signal
 * delayed by each lag in [-maxLag, +maxLag] frames. cueSignal index 0 is
 * maxLag frames before the audio window starts.
 */
function correlationByLag(speech: Uint8Array, cueSignal: Uint8Array, maxLag: number): Float64Array {
  const n = speech.length;
  const { sum } = prefixSums(cueSignal);
  const lags = new Float64Array(2 * maxLag + 1);

  let audioSum = 0;
  for (let i = 0; i < n; i++) audioSum += speech[i];
  const audioMean = audioSum / n;
  let audioVar = 0;
  for (let i = 0; i < n; i++) audioVar += (speech[i] - audioMean) ** 2;
  if (audioVar === 0) return lags;

  for (let lag = -maxLag; lag <= maxLag; lag++) {
    // Cue frame aligned with audio frame i is cueSignal[i + maxLag - lag].
    const base = maxLag - lag;
    let cross = 0;
    for (let i = 0; i < n; i++) if (speech[i] === 1) cross += cueSignal[i + base];

    const cueSum = sum[base + n] - sum[base];
    const cueVar = cueSum - (cueSum * cueSum) / n;
    if (cueVar <= 0) continue;
    lags[lag + maxLag] = (cross - audioMean * cueSum) / Math.sqrt(audioVar * cueVar);
  }

  return lags;
}

function parabolicOffset(left: number, center: number, right: number): number {
  const denominator = left - 2 * center + right;
  return denominator === 0 ? 0 : (0.5 * (left - right)) / denominator;
}

function bestSidelobe(lags: Float64Array, peakIndex: number): number {
  const exclusion = Math.round(PEAK_EXCLUSION_SEC / FRAME_SEC);
  let best = 0;
  for (let i = 0; i < lags.length; i++) {
    if (Math.abs(i - peakIndex) > exclusion && lags[i] > best) best = lags[i];
  }
  return best;
}

/**
 * Finds how many seconds the cues must be delayed (+) or advanced (-) to line
 * up with the speech heard in one window.
 *
 * @param speech     speech/silence frames of the heard audio
 * @param windowStart video time of speech[0], in seconds
 * @param cues       cues on the subtitle file's own timeline
 */
export function matchWindow(
  speech: Uint8Array,
  windowStart: number,
  cues: readonly SubtitleCue[],
  maxShiftSec: number = MAX_SHIFT_SEC
): WindowMatch | null {
  if (speech.length === 0) return null;

  const maxLag = Math.round(maxShiftSec / FRAME_SEC);
  const cueSignal = buildCueSignal(cues, windowStart - maxShiftSec, speech.length + 2 * maxLag);
  const lags = correlationByLag(speech, cueSignal, maxLag);

  let peakIndex = 0;
  for (let i = 1; i < lags.length; i++) if (lags[i] > lags[peakIndex]) peakIndex = i;
  const peak = lags[peakIndex];
  if (peak <= 0) return null;

  const interior = peakIndex > 0 && peakIndex < lags.length - 1;
  const fraction = interior ? parabolicOffset(lags[peakIndex - 1], peak, lags[peakIndex + 1]) : 0;
  const offsetSec = (peakIndex - maxLag + fraction) * FRAME_SEC;
  const sidelobe = bestSidelobe(lags, peakIndex);

  return { offsetSec, peak, sidelobe, confidence: peak - sidelobe };
}

export function isConfident(match: WindowMatch): boolean {
  return (
    (match.peak >= 0.35 && match.confidence >= 0.025) ||
    (match.peak >= MIN_PEAK && match.confidence >= MIN_CONFIDENCE)
  );
}
