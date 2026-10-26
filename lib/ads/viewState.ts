import type { AdInfo, AdProgress } from "./types";

export interface AdViewState {
  isSkippable: boolean;
  /** IMA reports the ad can be skipped right now. */
  canSkipNow: boolean;
  /** Whole seconds until the skip button unlocks, 0 once it can be used. */
  skipInSec: number;
  /** Fill of the countdown towards the skip button, 0 to 100. */
  skipProgressPercent: number;
  remainingSec: number;
  durationSec: number;
  /** Ad playback position, 0 to 100. */
  progressPercent: number;
  positionLabel: string;
  canUseCustomUi: boolean;
}

function toPercent(part: number, whole: number): number {
  if (whole <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (part / whole) * 100));
}

function buildPositionLabel(info: AdInfo): string {
  return info.podTotal > 1 ? `Ad ${info.podIndex} of ${info.podTotal}` : "Ad";
}

export function buildAdViewState(info: AdInfo, progress: AdProgress | null): AdViewState {
  const elapsedSec = progress?.elapsedSec ?? 0;
  const skipOffsetSec = info.skipOffsetSec ?? 0;
  const canSkipNow = info.isSkippable && (progress?.isSkippableNow ?? false);

  return {
    isSkippable: info.isSkippable,
    canSkipNow,
    skipInSec: canSkipNow ? 0 : Math.max(0, Math.ceil(skipOffsetSec - elapsedSec)),
    skipProgressPercent: canSkipNow ? 100 : toPercent(elapsedSec, skipOffsetSec),
    remainingSec: progress?.remainingSec ?? info.durationSec,
    durationSec: info.durationSec,
    progressPercent: toPercent(elapsedSec, info.durationSec),
    positionLabel: buildPositionLabel(info),
    canUseCustomUi: info.canUseCustomUi,
  };
}
