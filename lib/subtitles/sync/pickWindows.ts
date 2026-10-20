import type { SubtitleCue, TimeWindow } from "./types";

export const MAX_LISTEN_SEC = 30;
export const MIN_LISTEN_SEC = 10;

const INTRO_SKIP_MIN_SEC = 120;
const INTRO_SKIP_FRACTION = 0.05;
const CREDITS_START_FRACTION = 0.9;
const MAX_WINDOWS = 3;
const LONGEST_CUE_CAP_SEC = 8;
const EDGE_WEIGHT_SEC = 0.3;

interface ScoredWindow extends TimeWindow {
  score: number;
}

function overlap(cue: SubtitleCue, window: TimeWindow): number {
  return Math.max(0, Math.min(cue.end, window.end) - Math.max(cue.start, window.start));
}

/**
 * Scores a window by how much dialogue it holds, plus a bonus for the longest
 * single line (long sentences give an unambiguous speech block) and for cue
 * boundaries (edges are what the correlation locks onto).
 */
function scoreWindow(cues: readonly SubtitleCue[], window: TimeWindow): number {
  let speech = 0;
  let edges = 0;
  let longest = 0;

  for (const cue of cues) {
    if (cue.end <= window.start) continue;
    if (cue.start >= window.end) break;
    const inside = overlap(cue, window);
    speech += inside;
    longest = Math.max(longest, inside);
    if (cue.start >= window.start) edges++;
    if (cue.end <= window.end) edges++;
  }

  return speech + Math.min(longest, LONGEST_CUE_CAP_SEC) + edges * EDGE_WEIGHT_SEC;
}

function isEligible(cue: SubtitleCue, durationSec: number): boolean {
  const introEnd = Math.max(INTRO_SKIP_MIN_SEC, durationSec * INTRO_SKIP_FRACTION);
  return cue.start >= introEnd && cue.end <= durationSec * CREDITS_START_FRACTION;
}

function overlapsAny(window: TimeWindow, chosen: readonly TimeWindow[]): boolean {
  return chosen.some((other) => window.start < other.end && window.end > other.start);
}

/**
 * Picks up to three non-overlapping listening windows, best first.
 * Skips the intro and credits, then favours the densest dialogue so the
 * player never has to listen to a quiet or music-only stretch.
 * A window is MAX_LISTEN_SEC long, but is shortened (never below
 * MIN_LISTEN_SEC) to end where dialogue stops, so we listen no longer than needed.
 */
export function pickListenWindows(cues: readonly SubtitleCue[], durationSec: number): TimeWindow[] {
  const eligible = cues.filter((cue) => isEligible(cue, durationSec));

  const scored: ScoredWindow[] = eligible.map((cue) => {
    const start = Math.max(0, cue.start - 1);
    const window = { start, end: Math.min(durationSec, start + MAX_LISTEN_SEC) };
    return { ...window, score: scoreWindow(cues, window) };
  });
  scored.sort((a, b) => b.score - a.score);

  const chosen: TimeWindow[] = [];
  for (const candidate of scored) {
    if (chosen.length === MAX_WINDOWS) break;
    if (candidate.end - candidate.start < MIN_LISTEN_SEC) continue;
    if (overlapsAny(candidate, chosen)) continue;
    chosen.push({ start: candidate.start, end: candidate.end });
  }

  return chosen;
}
