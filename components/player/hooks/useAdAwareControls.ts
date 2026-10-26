import { useCallback } from "react";

import type { UseImaAdsResult } from "./useImaAds";
import type { UsePlayerStateResult } from "./usePlayerState";

type AdState = Pick<UseImaAdsResult, "isAdBreak">;
type ContentControls = Pick<
  UsePlayerStateResult,
  "play" | "pause" | "togglePlay" | "seekTo" | "seekBy" | "toggleMute"
>;

/**
 * Turns the content controls into no-ops while an ad break is on. Ads cannot be paused, seeked or
 * muted from the player: only fullscreen and skip (when the ad allows it) stay available.
 */
export function useAdAwareControls(ads: AdState, content: ContentControls): ContentControls {
  const { isAdBreak } = ads;
  const { play, pause, togglePlay, seekTo, seekBy, toggleMute } = content;

  const guardedPlay = useCallback(() => {
    if (!isAdBreak) {
      play();
    }
  }, [isAdBreak, play]);
  const guardedPause = useCallback(() => {
    if (!isAdBreak) {
      pause();
    }
  }, [isAdBreak, pause]);
  const guardedTogglePlay = useCallback(() => {
    if (!isAdBreak) {
      togglePlay();
    }
  }, [isAdBreak, togglePlay]);
  const guardedSeekTo = useCallback(
    (time: number) => {
      if (!isAdBreak) {
        seekTo(time);
      }
    },
    [isAdBreak, seekTo]
  );
  const guardedSeekBy = useCallback(
    (seconds: number) => {
      if (!isAdBreak) {
        seekBy(seconds);
      }
    },
    [isAdBreak, seekBy]
  );
  const guardedToggleMute = useCallback(() => {
    if (!isAdBreak) {
      toggleMute();
    }
  }, [isAdBreak, toggleMute]);

  return {
    play: guardedPlay,
    pause: guardedPause,
    togglePlay: guardedTogglePlay,
    seekTo: guardedSeekTo,
    seekBy: guardedSeekBy,
    toggleMute: guardedToggleMute,
  };
}
