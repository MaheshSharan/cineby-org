import { describe, expect, it } from "vitest";

import { pickMidrollCue } from "@/lib/ads/schedule";

const MOVIE_SEC = 2 * 3600;

describe("pickMidrollCue", () => {
  it("spans minute 10 to minute 25 for a feature film", () => {
    expect(pickMidrollCue({ durationSec: MOVIE_SEC, startTimeSec: 0, random: () => 0 })).toBe(600);
    expect(pickMidrollCue({ durationSec: MOVIE_SEC, startTimeSec: 0, random: () => 0.999999 })).toBe(1499);
  });

  it("returns whole seconds inside the window for any random value", () => {
    for (let step = 0; step < 100; step += 1) {
      const cue = pickMidrollCue({ durationSec: MOVIE_SEC, startTimeSec: 0, random: () => step / 100 });

      expect(Number.isInteger(cue)).toBe(true);
      expect(cue).toBeGreaterThanOrEqual(600);
      expect(cue).toBeLessThanOrEqual(1500);
    }
  });

  it("keeps the ad away from the end of a short episode", () => {
    // 22 min episode: the latest allowed cue is 5 min before the end.
    const cue = pickMidrollCue({ durationSec: 22 * 60, startTimeSec: 0, random: () => 0.999999 });

    expect(cue).toBeLessThanOrEqual(22 * 60 - 5 * 60);
    expect(cue).toBeGreaterThanOrEqual(600);
  });

  it("skips titles too short to fit an ad", () => {
    expect(pickMidrollCue({ durationSec: 14 * 60, startTimeSec: 0 })).toBeNull();
  });

  it("places the ad after the resume point", () => {
    const cue = pickMidrollCue({ durationSec: MOVIE_SEC, startTimeSec: 12 * 60, random: () => 0 });

    expect(cue).toBe(14 * 60);
  });

  it("skips when the viewer resumed too late for the window", () => {
    expect(pickMidrollCue({ durationSec: MOVIE_SEC, startTimeSec: 40 * 60 })).toBeNull();
  });

  it("skips when the duration is unknown", () => {
    expect(pickMidrollCue({ durationSec: Number.NaN, startTimeSec: 0 })).toBeNull();
  });
});
