import { PlayerActionButtonShell } from "./PlayerActionButtonShell";
import type { AdViewState } from "@/lib/ads/viewState";

interface AdSkipButtonProps {
  ad: AdViewState;
  isControlsVisible: boolean;
  onSkip: () => void;
}

function formatSeconds(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function buildCountdownLabel(ad: AdViewState): string {
  return ad.skipInSec > 0 ? `Skip in ${ad.skipInSec}` : "Skip";
}

/**
 * Skip control for video ads, rendered in the same slot as Skip Intro and Next Episode.
 * It unlocks only when the ad reports it can be skipped. Ads that cannot be skipped get a
 * non-interactive countdown chip instead.
 */
export function AdSkipButton({ ad, isControlsVisible, onSkip }: AdSkipButtonProps) {
  if (!ad.isSkippable) {
    return (
      <PlayerActionButtonShell
        isStatic
        label={`${ad.positionLabel} · ${formatSeconds(ad.remainingSec)}`}
        isControlsVisible={isControlsVisible}
      />
    );
  }

  return (
    <PlayerActionButtonShell
      label={ad.canSkipNow ? "Skip Ad" : buildCountdownLabel(ad)}
      icon={ad.canSkipNow ? undefined : null}
      progressPercent={ad.skipProgressPercent}
      isDisabled={!ad.canSkipNow}
      isControlsVisible={isControlsVisible}
      onClick={onSkip}
    />
  );
}
