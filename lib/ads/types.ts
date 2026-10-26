import type { ImaSdk } from "@alugha/ima";

export type { ImaSdk };

/** Browser-safe mid-roll settings, resolved on the server from the Video Ads env variables. */
export interface VideoAdsSettings {
  tagUrl: string;
  zoneId: string;
  cooldownMin: number;
  episodesBetween: number;
  requestTimeoutMs: number;
  ecpmUsd: number;
}

export type AdConfig = ({ enabled: true } & VideoAdsSettings) | { enabled: false };

export type AdPhase =
  | "deciding"
  | "scheduled"
  | "requesting"
  | "ready"
  | "starting"
  | "awaitingTap"
  | "playing"
  | "paused"
  | "done";

export type AdFailReason =
  | "sdk_blocked"
  | "sdk_timeout"
  | "request_timeout"
  | "start_timeout"
  | "no_fill"
  | "ad_error";

export type AdEndReason = "completed" | "skipped";

export interface AdInfo {
  isSkippable: boolean;
  /** Seconds of playback before the ad can be skipped. Null when the ad is not skippable. */
  skipOffsetSec: number | null;
  durationSec: number;
  /** True when IMA lets the player draw its own ad UI (custom skip button, progress bar). */
  canUseCustomUi: boolean;
  podIndex: number;
  podTotal: number;
}

export interface AdProgress {
  elapsedSec: number;
  remainingSec: number;
  durationSec: number;
  isSkippableNow: boolean;
}

export type AdQuartile = 25 | 50 | 75 | 100;

export type AdControllerEvent =
  | { type: "requested" }
  | { type: "ready" }
  | { type: "loaded"; info: AdInfo }
  | { type: "awaitingTap" }
  | { type: "started"; info: AdInfo }
  | { type: "impression" }
  | { type: "progress"; progress: AdProgress }
  | { type: "quartile"; quartile: AdQuartile }
  | { type: "paused" }
  | { type: "resumed" }
  | { type: "clicked" }
  | { type: "ended"; reason: AdEndReason; watchedSec: number }
  | { type: "failed"; reason: AdFailReason; code: number | null; message: string };

export type AdControllerListener = (event: AdControllerEvent) => void;
