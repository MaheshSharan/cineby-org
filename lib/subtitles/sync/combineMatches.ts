import { isConfident } from "./correlate";
import type { WindowMatch } from "./types";

/** Windows whose offsets differ by less than this agree on one shift. */
const AGREEMENT_SEC = 0.25;

export interface WindowResult extends WindowMatch {
  /** Video time at the window's centre, in seconds. */
  atSec: number;
}

export type SyncOutcome =
  | { kind: "shift"; offsetSec: number; confidence: number }
  | { kind: "inconsistent" }
  | { kind: "no-match" };

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Merges per-window matches into one decision. Weak windows are ignored.
 * If the confident windows disagree, the subtitles drift (different cut or
 * frame rate), so a single shift would be wrong and we report that instead.
 */
export function combineMatches(results: readonly WindowResult[]): SyncOutcome {
  const confident = results.filter(isConfident);
  if (confident.length === 0) return { kind: "no-match" };

  const offsets = confident.map((result) => result.offsetSec);
  if (Math.max(...offsets) - Math.min(...offsets) > AGREEMENT_SEC) return { kind: "inconsistent" };

  return {
    kind: "shift",
    offsetSec: median(offsets),
    confidence: Math.max(...confident.map((result) => result.confidence)),
  };
}
