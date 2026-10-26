export interface AdBreakParams {
  content_id: string;
  media_type: "movie" | "tv";
  ad_break_id: string;
  break_type: "midroll";
  zone_id: string;
}

type AdEvent<Action extends string, Params extends object = object> = {
  action: Action;
  params: AdBreakParams & Params;
};

export type AdAnalyticsEvent =
  | AdEvent<
      "ad_break_decision",
      { decision: "play" | "skip"; reason?: string }
    >
  | AdEvent<"ad_request", { sdk_load_ms: number }>
  | AdEvent<
      "ad_loaded",
      {
        latency_ms: number;
        is_skippable: boolean;
        skip_offset_s: number;
        duration_s: number;
        ui_mode: "custom" | "native";
      }
    >
  | AdEvent<
      "ad_impression",
      {
        ad_platform: "hilltopads";
        ad_source: "hilltopads_vast";
        ad_format: "video_midroll";
        ad_unit_name: string;
        /** Estimated: configured eCPM / 1000. The HilltopAds dashboard is the source of truth. */
        value: number;
        currency: "USD";
      }
    >
  | AdEvent<"ad_start">
  | AdEvent<"ad_quartile", { quartile: 25 | 50 | 75 | 100 }>
  | AdEvent<"ad_complete", { watched_s: number }>
  | AdEvent<"ad_skip", { watched_s: number }>
  | AdEvent<"ad_click">
  | AdEvent<"ad_pause">
  | AdEvent<"ad_resume">
  | AdEvent<"ad_error", { reason: string; code: number; error_message: string }>
  | AdEvent<"ad_blocked", { cause: "sdk_blocked" | "sdk_timeout" }>
  /** How long the movie stayed paused between the cue point and the first frame of the ad. */
  | AdEvent<"ad_wait", { wait_ms: number }>;
