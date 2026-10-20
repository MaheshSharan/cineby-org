import { FRAME_SEC } from "./types";

const SPEECH_LOW_HZ = 300;
const SPEECH_HIGH_HZ = 3400;
const BUTTERWORTH_Q = Math.SQRT1_2;
const NOISE_PERCENTILE = 0.1;
const SPEECH_PERCENTILE = 0.9;
/** Threshold sits this far up from the noise floor towards the speech level. */
const THRESHOLD_POSITION = 0.4;
/** Less dynamic range than this (in dB) means no clear speech is present. */
const MIN_DYNAMIC_RANGE_DB = 6;
const MIN_SPEECH_FRAMES = 10;
const MAX_GAP_FRAMES = 15;
const SILENCE_FLOOR = 1e-9;

type BiquadKind = "highpass" | "lowpass";

interface Biquad {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

function designBiquad(kind: BiquadKind, cutoffHz: number, sampleRate: number): Biquad {
  const w0 = (2 * Math.PI * cutoffHz) / sampleRate;
  const alpha = Math.sin(w0) / (2 * BUTTERWORTH_Q);
  const cos = Math.cos(w0);
  const a0 = 1 + alpha;
  const sign = kind === "highpass" ? 1 : -1;

  return {
    b0: ((1 + sign * cos) / 2) / a0,
    b1: (-sign * (1 + sign * cos)) / a0,
    b2: ((1 + sign * cos) / 2) / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  };
}

function applyBiquad(input: Float32Array, filter: Biquad): Float32Array {
  const output = new Float32Array(input.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;

  for (let i = 0; i < input.length; i++) {
    const x0 = input[i];
    const y0 = filter.b0 * x0 + filter.b1 * x1 + filter.b2 * x2 - filter.a1 * y1 - filter.a2 * y2;
    output[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }

  return output;
}

/** Band-limits audio to the speech range, rejecting rumble and hiss. */
export function speechBandFilter(samples: Float32Array, sampleRate: number): Float32Array {
  const highPassed = applyBiquad(samples, designBiquad("highpass", SPEECH_LOW_HZ, sampleRate));
  return applyBiquad(highPassed, designBiquad("lowpass", SPEECH_HIGH_HZ, sampleRate));
}

/** Frame energy in dB, one value per FRAME_SEC of audio. */
export function frameEnergiesDb(samples: Float32Array, sampleRate: number): Float32Array {
  const frameSize = Math.round(sampleRate * FRAME_SEC);
  const frameCount = Math.floor(samples.length / frameSize);
  const energies = new Float32Array(frameCount);

  for (let frame = 0; frame < frameCount; frame++) {
    let sum = 0;
    for (let i = frame * frameSize; i < (frame + 1) * frameSize; i++) sum += samples[i] * samples[i];
    energies[frame] = 10 * Math.log10(sum / frameSize + SILENCE_FLOOR);
  }

  return energies;
}

function percentile(values: Float32Array, fraction: number): number {
  const sorted = Float32Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

/** Fills short silent gaps so one sentence is not chopped into pieces. */
function closeGaps(frames: Uint8Array): void {
  let gapStart = -1;
  for (let i = 0; i < frames.length; i++) {
    if (frames[i] === 0) {
      if (gapStart === -1) gapStart = i;
      continue;
    }
    if (gapStart !== -1 && gapStart > 0 && i - gapStart <= MAX_GAP_FRAMES) frames.fill(1, gapStart, i);
    gapStart = -1;
  }
}

/** Removes speech runs too short to be a word. */
function dropBlips(frames: Uint8Array): void {
  let runStart = -1;
  for (let i = 0; i <= frames.length; i++) {
    const on = i < frames.length && frames[i] === 1;
    if (on && runStart === -1) runStart = i;
    if (!on && runStart !== -1) {
      if (i - runStart < MIN_SPEECH_FRAMES) frames.fill(0, runStart, i);
      runStart = -1;
    }
  }
}

/**
 * Marks each frame as speech (1) or not (0) with a threshold that adapts to
 * the clip's own noise floor and speech level, so loud and quiet mixes both work.
 */
export function detectSpeechFrames(energiesDb: Float32Array): Uint8Array {
  const frames = new Uint8Array(energiesDb.length);
  if (energiesDb.length === 0) return frames;

  const floor = percentile(energiesDb, NOISE_PERCENTILE);
  const level = percentile(energiesDb, SPEECH_PERCENTILE);
  if (level - floor < MIN_DYNAMIC_RANGE_DB) return frames;

  const threshold = floor + (level - floor) * THRESHOLD_POSITION;
  for (let i = 0; i < energiesDb.length; i++) frames[i] = energiesDb[i] > threshold ? 1 : 0;

  closeGaps(frames);
  dropBlips(frames);
  return frames;
}

/** Full chain: PCM in, speech frames out. */
export function detectSpeech(samples: Float32Array, sampleRate: number): Uint8Array {
  return detectSpeechFrames(frameEnergiesDb(speechBandFilter(samples, sampleRate), sampleRate));
}
