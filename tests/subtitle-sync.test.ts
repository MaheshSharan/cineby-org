import { describe, expect, it } from "vitest";
import { parseCues } from "@/lib/subtitles/sync/parseCues";
import { pickListenWindows } from "@/lib/subtitles/sync/pickWindows";
import { detectSpeech } from "@/lib/subtitles/sync/speechDetector";
import { matchWindow } from "@/lib/subtitles/sync/correlate";
import { combineMatches } from "@/lib/subtitles/sync/combineMatches";
import { buildCueSignal } from "@/lib/subtitles/sync/cueSignal";
import { FRAME_SEC, type SubtitleCue } from "@/lib/subtitles/sync/types";

/** Deterministic pseudo-random numbers so tests never flake. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function makeCues(starts: number[], length: number): SubtitleCue[] {
  return starts.map((start) => ({ start, end: start + length, text: "line" }));
}

// Irregular dialogue, so the pattern has a single best alignment.
const DIALOGUE = makeCues([0, 2.7, 3.9, 8.1, 11, 12.6, 17.2, 18.4, 21.9, 25.3], 1.7);

function speechFromCues(cues: SubtitleCue[], offsetSec: number, windowStart: number, lengthSec: number): Uint8Array {
  const frames = Math.round(lengthSec / FRAME_SEC);
  const shifted = cues.map((cue) => ({ ...cue, start: cue.start + offsetSec, end: cue.end + offsetSec }));
  return buildCueSignal(shifted, windowStart, frames);
}

describe("parseCues", () => {
  it("parses SRT and WebVTT, stripping markup", () => {
    const srt = "1\n00:01:02,500 --> 00:01:04,000\n<i>Hello</i>\nthere\n\n2\n00:01:05,000 --> 00:01:06,250\nBye\n";
    const vtt = "WEBVTT\n\n01:02.500 --> 01:04.000\nHello there\n";
    expect(parseCues(srt)).toEqual([
      { start: 62.5, end: 64, text: "Hello there" },
      { start: 65, end: 66.25, text: "Bye" },
    ]);
    expect(parseCues(vtt)[0]).toEqual({ start: 62.5, end: 64, text: "Hello there" });
  });

  it("drops empty and zero-length cues", () => {
    expect(parseCues("1\n00:00:01,000 --> 00:00:01,000\nx\n\n2\n00:00:02,000 --> 00:00:03,000\n\n")).toEqual([]);
  });
});

describe("pickListenWindows", () => {
  it("skips the intro and credits and prefers dense dialogue", () => {
    const duration = 6000;
    const sparse = makeCues([30, 400, 900, 1500], 2);
    const dense = makeCues([3000, 3003, 3006, 3009, 3012, 3015, 3018, 3021], 2.5);
    const credits = makeCues([5800, 5803, 5806, 5809, 5812], 2.5);
    const windows = pickListenWindows([...sparse, ...dense, ...credits], duration);

    expect(windows[0].start).toBeGreaterThanOrEqual(2990);
    expect(windows[0].start).toBeLessThanOrEqual(3010);
    expect(windows.every((w) => w.start > 120 && w.end <= duration * 0.9)).toBe(true);
    expect(windows.every((w) => w.end - w.start <= 30 && w.end - w.start >= 10)).toBe(true);
  });

  it("returns non-overlapping windows", () => {
    const cues = makeCues(Array.from({ length: 80 }, (_, i) => 600 + i * 3), 2);
    const windows = pickListenWindows(cues, 6000);
    for (let i = 1; i < windows.length; i++) {
      expect(windows[i].start >= windows[i - 1].end || windows[i].end <= windows[i - 1].start).toBe(true);
    }
  });

  it("returns nothing when no cue is eligible", () => {
    expect(pickListenWindows(makeCues([5, 10], 2), 6000)).toEqual([]);
  });
});

describe("detectSpeech", () => {
  const sampleRate = 16000;

  function synth(speechRanges: Array<[number, number]>, seconds: number, hum: boolean): Float32Array {
    const random = seeded(7);
    const samples = new Float32Array(sampleRate * seconds);
    for (let i = 0; i < samples.length; i++) {
      const t = i / sampleRate;
      const inSpeech = speechRanges.some(([from, to]) => t >= from && t < to);
      const voice = inSpeech ? 0.4 * Math.sin(2 * Math.PI * 800 * t) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 4 * t)) : 0;
      const rumble = hum ? 0.5 * Math.sin(2 * Math.PI * 60 * t) : 0;
      samples[i] = voice + rumble + (random() - 0.5) * 0.01;
    }
    return samples;
  }

  it("marks speech-band bursts and ignores silence", () => {
    const frames = detectSpeech(synth([[2, 4], [6, 8]], 10, false), sampleRate);
    const at = (sec: number) => frames[Math.round(sec / FRAME_SEC)];
    expect([at(3), at(7)]).toEqual([1, 1]);
    expect([at(1), at(5), at(9)]).toEqual([0, 0, 0]);
  });

  it("rejects loud low-frequency rumble outside the speech band", () => {
    const frames = detectSpeech(synth([[2, 4]], 6, true), sampleRate);
    expect(frames[Math.round(3 / FRAME_SEC)]).toBe(1);
    expect(frames[Math.round(5 / FRAME_SEC)]).toBe(0);
  });

  it("reports no speech for flat noise", () => {
    const random = seeded(3);
    const noise = Float32Array.from({ length: sampleRate * 5 }, () => (random() - 0.5) * 0.2);
    expect(detectSpeech(noise, sampleRate).some((v) => v === 1)).toBe(false);
  });
});

describe("matchWindow", () => {
  const windowStart = 300;
  const length = 30;

  it.each([1.34, -2.5, 0, 12.07])("recovers a known offset of %f s to within 20 ms", (offset) => {
    const speech = speechFromCues(DIALOGUE.map((c) => ({ ...c, start: c.start + windowStart, end: c.end + windowStart })), offset, windowStart, length);
    const cues = DIALOGUE.map((c) => ({ ...c, start: c.start + windowStart, end: c.end + windowStart }));
    // Heard speech is the cues moved by +offset, so the match must report +offset.
    const match = matchWindow(speech, windowStart, cues);
    expect(match).not.toBeNull();
    expect(Math.abs(match!.offsetSec - offset)).toBeLessThan(0.02);
    expect(match!.confidence).toBeGreaterThan(0.12);
  });

  it("tolerates missing and spurious speech frames", () => {
    const random = seeded(11);
    const cues = DIALOGUE.map((c) => ({ ...c, start: c.start + windowStart, end: c.end + windowStart }));
    const speech = speechFromCues(cues, 0.8, windowStart, length).map((v) => (random() < 0.08 ? 1 - v : v));
    const match = matchWindow(Uint8Array.from(speech), windowStart, cues);
    expect(Math.abs(match!.offsetSec - 0.8)).toBeLessThan(0.03);
  });

  it("returns null for silence", () => {
    expect(matchWindow(new Uint8Array(3000), windowStart, DIALOGUE)).toBeNull();
  });
});

describe("combineMatches", () => {
  const good = { peak: 0.8, sidelobe: 0.2, confidence: 0.6, atSec: 100 };

  it("takes the median of agreeing windows", () => {
    const outcome = combineMatches([
      { ...good, offsetSec: 1.3 },
      { ...good, offsetSec: 1.34 },
      { ...good, offsetSec: 1.4 },
    ]);
    expect(outcome).toMatchObject({ kind: "shift", offsetSec: 1.34 });
  });

  it("flags windows that disagree as inconsistent", () => {
    expect(combineMatches([{ ...good, offsetSec: 1 }, { ...good, offsetSec: 3 }]).kind).toBe("inconsistent");
  });

  it("ignores weak windows and reports no match when none are confident", () => {
    const weak = { peak: 0.1, sidelobe: 0.09, confidence: 0.01, atSec: 50, offsetSec: 9 };
    expect(combineMatches([weak]).kind).toBe("no-match");
    expect(combineMatches([weak, { ...good, offsetSec: 2 }])).toMatchObject({ kind: "shift", offsetSec: 2 });
  });
});
