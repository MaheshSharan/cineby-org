import { FAILURE_BACKOFF_MIN, MS_PER_MINUTE, SAME_TITLE_WINDOW_MIN } from "./constants";

export interface AdFrequencyState {
  lastAdAt: number | null;
  lastAdMediaKey: string | null;
  /** TV episodes started since the last mid-roll. */
  episodesSinceAd: number;
  lastFailureAt: number | null;
}

export const INITIAL_AD_FREQUENCY_STATE: AdFrequencyState = {
  lastAdAt: null,
  lastAdMediaKey: null,
  episodesSinceAd: 0,
  lastFailureAt: null,
};

export type MidrollSkipReason =
  | "recent_failure"
  | "same_title_recently"
  | "cooldown"
  | "episode_cadence"
  | "outside_window";

export type MidrollDecision = { shouldPlay: true } | { shouldPlay: false; reason: MidrollSkipReason };

export interface MidrollInput {
  mediaKey: string;
  isTv: boolean;
  nowMs: number;
  state: AdFrequencyState;
  cooldownMin: number;
  episodesBetween: number;
}

function minutesSince(nowMs: number, thenMs: number): number {
  return (nowMs - thenMs) / MS_PER_MINUTE;
}

export function decideMidroll(input: MidrollInput): MidrollDecision {
  const { mediaKey, isTv, nowMs, state, cooldownMin, episodesBetween } = input;

  if (state.lastFailureAt !== null && minutesSince(nowMs, state.lastFailureAt) < FAILURE_BACKOFF_MIN) {
    return { shouldPlay: false, reason: "recent_failure" };
  }

  if (state.lastAdAt === null) {
    return { shouldPlay: true };
  }

  const minutesSinceAd = minutesSince(nowMs, state.lastAdAt);

  if (state.lastAdMediaKey === mediaKey && minutesSinceAd < SAME_TITLE_WINDOW_MIN) {
    return { shouldPlay: false, reason: "same_title_recently" };
  }

  if (minutesSinceAd < cooldownMin) {
    return { shouldPlay: false, reason: "cooldown" };
  }

  // The ad itself counts as one of the N episodes, so N - 1 episodes must pass without one.
  if (isTv && state.episodesSinceAd < episodesBetween - 1) {
    return { shouldPlay: false, reason: "episode_cadence" };
  }

  return { shouldPlay: true };
}

/** Skips caused by pacing rules still count as an episode the viewer watched. */
export function countsAsSkippedEpisode(isTv: boolean, reason: MidrollSkipReason): boolean {
  return isTv && (reason === "cooldown" || reason === "episode_cadence");
}
