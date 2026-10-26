import { describe, expect, it } from "vitest";

import { decideMidroll, countsAsSkippedEpisode, INITIAL_AD_FREQUENCY_STATE, type MidrollInput } from "@/lib/ads/policy";

const MINUTE = 60_000;
const NOW = 1_000_000_000;

function input(overrides: Partial<MidrollInput> = {}): MidrollInput {
  return {
    mediaKey: "movie:1",
    isTv: false,
    nowMs: NOW,
    state: INITIAL_AD_FREQUENCY_STATE,
    cooldownMin: 15,
    episodesBetween: 3,
    ...overrides,
  };
}

describe("decideMidroll", () => {
  it("plays the first mid-roll for a new visitor", () => {
    expect(decideMidroll(input())).toEqual({ shouldPlay: true });
  });

  it("skips while the previous attempt failed recently", () => {
    const state = { ...INITIAL_AD_FREQUENCY_STATE, lastFailureAt: NOW - 5 * MINUTE };

    expect(decideMidroll(input({ state }))).toEqual({ shouldPlay: false, reason: "recent_failure" });
  });

  it("tries again once the failure backoff has passed", () => {
    const state = { ...INITIAL_AD_FREQUENCY_STATE, lastFailureAt: NOW - 11 * MINUTE };

    expect(decideMidroll(input({ state }))).toEqual({ shouldPlay: true });
  });

  it("does not repeat an ad for the same title within the window", () => {
    const state = { ...INITIAL_AD_FREQUENCY_STATE, lastAdAt: NOW - 20 * MINUTE, lastAdMediaKey: "movie:1" };

    expect(decideMidroll(input({ state }))).toEqual({ shouldPlay: false, reason: "same_title_recently" });
  });

  it("applies the cooldown to a different title", () => {
    const state = { ...INITIAL_AD_FREQUENCY_STATE, lastAdAt: NOW - 10 * MINUTE, lastAdMediaKey: "movie:2" };

    expect(decideMidroll(input({ state }))).toEqual({ shouldPlay: false, reason: "cooldown" });
  });

  it("plays again after the cooldown", () => {
    const state = { ...INITIAL_AD_FREQUENCY_STATE, lastAdAt: NOW - 16 * MINUTE, lastAdMediaKey: "movie:2" };

    expect(decideMidroll(input({ state }))).toEqual({ shouldPlay: true });
  });

  it("returns to a title after the same-title window", () => {
    const state = { ...INITIAL_AD_FREQUENCY_STATE, lastAdAt: NOW - 31 * MINUTE, lastAdMediaKey: "movie:1" };

    expect(decideMidroll(input({ state }))).toEqual({ shouldPlay: true });
  });

  it("paces TV episodes: one ad every N episodes", () => {
    const base = { ...INITIAL_AD_FREQUENCY_STATE, lastAdAt: NOW - 60 * MINUTE, lastAdMediaKey: "tv:1:1:1" };
    const tv = { mediaKey: "tv:1:1:2", isTv: true };

    expect(decideMidroll(input({ ...tv, state: { ...base, episodesSinceAd: 0 } }))).toEqual({
      shouldPlay: false,
      reason: "episode_cadence",
    });
    expect(decideMidroll(input({ ...tv, state: { ...base, episodesSinceAd: 1 } }))).toEqual({
      shouldPlay: false,
      reason: "episode_cadence",
    });
    expect(decideMidroll(input({ ...tv, state: { ...base, episodesSinceAd: 2 } }))).toEqual({ shouldPlay: true });
  });

  it("does not apply episode pacing to movies", () => {
    const state = { ...INITIAL_AD_FREQUENCY_STATE, lastAdAt: NOW - 60 * MINUTE, lastAdMediaKey: "movie:2" };

    expect(decideMidroll(input({ state }))).toEqual({ shouldPlay: true });
  });
});

describe("countsAsSkippedEpisode", () => {
  it("counts only TV skips caused by pacing rules", () => {
    expect(countsAsSkippedEpisode(true, "cooldown")).toBe(true);
    expect(countsAsSkippedEpisode(true, "episode_cadence")).toBe(true);
    expect(countsAsSkippedEpisode(true, "same_title_recently")).toBe(false);
    expect(countsAsSkippedEpisode(true, "recent_failure")).toBe(false);
    expect(countsAsSkippedEpisode(false, "cooldown")).toBe(false);
  });
});
