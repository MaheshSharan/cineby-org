import { describe, expect, it } from "vitest";

import { createAdAnalytics, estimateImpressionValue } from "@/lib/ads/analytics";
import type { AdAnalyticsEvent } from "@/lib/ads/analyticsEvents";
import type { AdInfo } from "@/lib/ads/types";
import { buildAdViewState } from "@/lib/ads/viewState";

const SKIPPABLE: AdInfo = {
  isSkippable: true,
  skipOffsetSec: 15,
  durationSec: 30,
  canUseCustomUi: true,
  podIndex: 1,
  podTotal: 1,
};

function createRecorder() {
  const events: AdAnalyticsEvent[] = [];
  const analytics = createAdAnalytics(
    { contentId: "42", mediaType: "movie", breakId: "movie:42:1", zoneId: "7547805" },
    2,
    (event) => events.push(event),
    () => 1000
  );

  return { events, analytics };
}

describe("createAdAnalytics", () => {
  it("estimates one impression as eCPM / 1000", () => {
    expect(estimateImpressionValue(2)).toBe(0.002);
  });

  it("sends the impression once with estimated value and the zone as ad unit", () => {
    const { events, analytics } = createRecorder();

    analytics.recordControllerEvent({ type: "impression" });
    analytics.recordControllerEvent({ type: "impression" });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      action: "ad_impression",
      params: {
        ad_platform: "hilltopads",
        ad_unit_name: "7547805",
        value: 0.002,
        currency: "USD",
        content_id: "42",
      },
    });
  });

  it("reports skip versus completion and each quartile only once", () => {
    const { events, analytics } = createRecorder();

    analytics.recordControllerEvent({ type: "quartile", quartile: 25 });
    analytics.recordControllerEvent({ type: "quartile", quartile: 25 });
    analytics.recordControllerEvent({ type: "ended", reason: "skipped", watchedSec: 15.4 });
    analytics.recordControllerEvent({ type: "ended", reason: "completed", watchedSec: 30 });

    expect(events.map((event) => event.action)).toEqual(["ad_quartile", "ad_skip"]);
    expect(events[1]).toMatchObject({ params: { watched_s: 15 } });
  });

  it("reports the loaded ad's skip rules and UI mode", () => {
    const { events, analytics } = createRecorder();

    analytics.recordControllerEvent({ type: "loaded", info: SKIPPABLE });
    analytics.recordControllerEvent({
      type: "loaded",
      info: { ...SKIPPABLE, isSkippable: false, skipOffsetSec: null, canUseCustomUi: false },
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      params: { is_skippable: true, skip_offset_s: 15, duration_s: 30, ui_mode: "custom" },
    });
  });

  it("reports a failure once, with a placeholder when IMA gives no error code", () => {
    const { events, analytics } = createRecorder();

    analytics.recordControllerEvent({ type: "failed", reason: "start_timeout", code: null, message: "slow" });
    analytics.recordControllerEvent({ type: "failed", reason: "ad_error", code: 400, message: "again" });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ action: "ad_error", params: { reason: "start_timeout", code: -1 } });
  });
});

describe("buildAdViewState", () => {
  it("counts down to the skip button and unlocks only when IMA says so", () => {
    const waiting = buildAdViewState(SKIPPABLE, {
      elapsedSec: 5.2,
      remainingSec: 24.8,
      durationSec: 30,
      isSkippableNow: false,
    });

    expect(waiting).toMatchObject({ canSkipNow: false, skipInSec: 10 });
    expect(waiting.skipProgressPercent).toBeCloseTo(34.67, 1);

    const ready = buildAdViewState(SKIPPABLE, {
      elapsedSec: 15,
      remainingSec: 15,
      durationSec: 30,
      isSkippableNow: true,
    });

    expect(ready).toMatchObject({ canSkipNow: true, skipInSec: 0, skipProgressPercent: 100, progressPercent: 50 });
  });

  it("never offers skipping on a non-skippable ad, even if the flag is set", () => {
    const state = buildAdViewState(
      { ...SKIPPABLE, isSkippable: false, skipOffsetSec: null },
      { elapsedSec: 20, remainingSec: 10, durationSec: 30, isSkippableNow: true }
    );

    expect(state).toMatchObject({ isSkippable: false, canSkipNow: false });
  });

  it("labels ads in a pod", () => {
    expect(buildAdViewState({ ...SKIPPABLE, podIndex: 2, podTotal: 3 }, null).positionLabel).toBe("Ad 2 of 3");
    expect(buildAdViewState(SKIPPABLE, null).positionLabel).toBe("Ad");
  });
});
