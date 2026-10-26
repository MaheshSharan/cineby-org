import { trackEvent } from "@/lib/analytics/gtag";
import type { AdAnalyticsEvent, AdBreakParams } from "./analyticsEvents";
import type { AdSdkFailure } from "./imaSdk";
import type { MidrollDecision } from "./policy";
import type { AdControllerEvent } from "./types";

type TrackAdEvent = (event: AdAnalyticsEvent) => void;

export interface AdAnalyticsContext {
  contentId: string;
  mediaType: "movie" | "tv";
  breakId: string;
  zoneId: string;
}

export interface AdAnalytics {
  recordDecision(decision: MidrollDecision): void;
  recordSdkFailure(cause: AdSdkFailure): void;
  recordRequest(sdkLoadMs: number): void;
  recordControllerEvent(event: AdControllerEvent): void;
  recordWait(waitMs: number): void;
}

const NO_SKIP_OFFSET = -1;

/** Estimated revenue of one impression in USD. */
export function estimateImpressionValue(ecpmUsd: number): number {
  return ecpmUsd / 1000;
}

/**
 * Turns one ad break into GA4 events. One-shot events (impression, start, quartiles, completion)
 * are sent at most once per break even if IMA repeats them.
 */
export function createAdAnalytics(
  context: AdAnalyticsContext,
  ecpmUsd: number,
  track: TrackAdEvent = trackEvent,
  now: () => number = () => performance.now()
): AdAnalytics {
  const base: AdBreakParams = {
    content_id: context.contentId,
    media_type: context.mediaType,
    ad_break_id: context.breakId,
    break_type: "midroll",
    zone_id: context.zoneId,
  };
  const sentOnce = new Set<string>();
  let requestedAt = now();

  function once(key: string, send: () => void): void {
    if (sentOnce.has(key)) {
      return;
    }

    sentOnce.add(key);
    send();
  }

  return {
    recordDecision(decision) {
      track({
        action: "ad_break_decision",
        params: {
          ...base,
          decision: decision.shouldPlay ? "play" : "skip",
          ...(decision.shouldPlay ? {} : { reason: decision.reason }),
        },
      });
    },

    recordSdkFailure(cause) {
      track({ action: "ad_blocked", params: { ...base, cause } });
    },

    recordRequest(sdkLoadMs) {
      requestedAt = now();
      track({ action: "ad_request", params: { ...base, sdk_load_ms: Math.round(sdkLoadMs) } });
    },

    recordControllerEvent(event) {
      switch (event.type) {
        case "loaded":
          once("loaded", () =>
            track({
              action: "ad_loaded",
              params: {
                ...base,
                latency_ms: Math.round(now() - requestedAt),
                is_skippable: event.info.isSkippable,
                skip_offset_s: event.info.skipOffsetSec ?? NO_SKIP_OFFSET,
                duration_s: event.info.durationSec,
                ui_mode: event.info.canUseCustomUi ? "custom" : "native",
              },
            })
          );
          break;
        case "started":
          once("start", () => track({ action: "ad_start", params: base }));
          break;
        case "impression":
          once("impression", () =>
            track({
              action: "ad_impression",
              params: {
                ...base,
                ad_platform: "hilltopads",
                ad_source: "hilltopads_vast",
                ad_format: "video_midroll",
                ad_unit_name: context.zoneId,
                value: estimateImpressionValue(ecpmUsd),
                currency: "USD",
              },
            })
          );
          break;
        case "quartile":
          once(`quartile-${event.quartile}`, () =>
            track({ action: "ad_quartile", params: { ...base, quartile: event.quartile } })
          );
          break;
        case "clicked":
          once("click", () => track({ action: "ad_click", params: base }));
          break;
        case "paused":
          track({ action: "ad_pause", params: base });
          break;
        case "resumed":
          track({ action: "ad_resume", params: base });
          break;
        case "ended":
          once("end", () =>
            track(
              event.reason === "skipped"
                ? { action: "ad_skip", params: { ...base, watched_s: Math.round(event.watchedSec) } }
                : { action: "ad_complete", params: { ...base, watched_s: Math.round(event.watchedSec) } }
            )
          );
          break;
        case "failed":
          once("end", () =>
            track({
              action: "ad_error",
              params: {
                ...base,
                reason: event.reason,
                code: event.code ?? NO_SKIP_OFFSET,
                error_message: event.message.slice(0, 100),
              },
            })
          );
          break;
        default:
          break;
      }
    },

    recordWait(waitMs) {
      track({ action: "ad_wait", params: { ...base, wait_ms: Math.round(waitMs) } });
    },
  };
}
