import {
  MIDROLL_END_MARGIN_SEC,
  MIDROLL_MAX_CUE_SEC,
  MIDROLL_MIN_CUE_SEC,
  MIDROLL_MIN_LEAD_SEC,
} from "./constants";

interface CueRequest {
  durationSec: number;
  /** Second playback starts from (0, or the resume position). */
  startTimeSec: number;
  /** Returns a number in [0, 1). Injected so tests are deterministic. */
  random?: () => number;
}

/**
 * Picks the second the ad plays at: random between minute 10 and minute 25, never within the last
 * minutes of the title, and never right after the point the viewer resumed from.
 * Returns null when the title is too short, or the viewer resumed too late, for an ad to fit.
 */
export function pickMidrollCue({ durationSec, startTimeSec, random = Math.random }: CueRequest): number | null {
  const earliest = Math.max(MIDROLL_MIN_CUE_SEC, startTimeSec + MIDROLL_MIN_LEAD_SEC);
  const latest = Math.min(MIDROLL_MAX_CUE_SEC, durationSec - MIDROLL_END_MARGIN_SEC);

  if (!Number.isFinite(durationSec) || latest < earliest) {
    return null;
  }

  return Math.floor(earliest + random() * (latest - earliest));
}
