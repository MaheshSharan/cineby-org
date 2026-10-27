import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";

import { canAutoStartAds, readAutoplayEnvironment } from "@/lib/ads/autoplay";
import { AD_READY_GRACE_SEC, AD_REQUEST_LEAD_SEC } from "@/lib/ads/constants";
import { createAdsController, type AdsController } from "@/lib/ads/controller";
import { AdSdkError, loadImaSdk } from "@/lib/ads/imaSdk";
import { getBrowserAdStorage, recordAdFailure, recordAdShown } from "@/lib/ads/storage";
import type { AdControllerEvent, AdInfo, AdPhase, AdProgress, ImaSdk } from "@/lib/ads/types";
import { buildAdViewState, type AdViewState } from "@/lib/ads/viewState";
import type { AdSchedule } from "./useAdSchedule";

interface UseImaAdsParams {
  mediaKey: string;
  schedule: AdSchedule;
  currentTimeSec: number;
  isContentPlaying: boolean;
  pauseContent: () => void;
  resumeContent: () => void;
  adContainerRef: RefObject<HTMLDivElement | null>;
  adVideoRef: RefObject<HTMLVideoElement | null>;
  contentVideoRef: RefObject<HTMLVideoElement | null>;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
}

export interface UseImaAdsResult {
  /** Second to mark on the seek bar. Null once the ad has played, was dropped, or never applies. */
  cueMarkerSec: number | null;
  /** The movie is paused for an ad: waiting for it to start, or watching it. */
  isAdBreak: boolean;
  /** The movie is paused and the ad is about to start. Show a spinner. */
  isStarting: boolean;
  /** An ad is on screen (or waiting for a tap). */
  isAdActive: boolean;
  isAdPlaying: boolean;
  needsTap: boolean;
  isPaused: boolean;
  ad: AdViewState | null;
  startFromTap: () => void;
  resumeAd: () => void;
  pauseAd: () => void;
  skip: () => void;
}

interface AdBreakState {
  mediaKey: string;
  phase: AdPhase | null;
  info: AdInfo | null;
  progress: AdProgress | null;
}

/** One ad break in flight. Lives in a ref because it outlives renders and is cancelled on title change. */
interface BreakSession {
  controller: AdsController | null;
  isReleased: boolean;
  releasedAt: number;
  cancel: () => void;
}

const CUE_MARKER_PHASES: readonly AdPhase[] = ["scheduled", "requesting", "ready"];
const ACTIVE_PHASES: readonly AdPhase[] = ["awaitingTap", "playing", "paused"];

function createBreakState(mediaKey: string): AdBreakState {
  return { mediaKey, phase: null, info: null, progress: null };
}

function phaseFromSchedule(schedule: AdSchedule): AdPhase {
  switch (schedule.status) {
    case "pending":
      return "deciding";
    case "none":
      return "done";
    default:
      return "scheduled";
  }
}

function readLocale(): string {
  return navigator.language.split("-")[0] || "en";
}

/**
 * Runs the mid-roll chosen by useAdSchedule. The ad is requested shortly before its cue while the
 * movie keeps playing. At the cue the movie pauses and the ad plays; afterwards the movie resumes.
 * Anything that goes wrong before the cue is invisible to the viewer, and anything that goes wrong
 * after it resumes the movie immediately.
 */
export function useImaAds({
  mediaKey,
  schedule,
  currentTimeSec,
  isContentPlaying,
  pauseContent,
  resumeContent,
  adContainerRef,
  adVideoRef,
  contentVideoRef,
  volume,
  isMuted,
  isFullscreen,
}: UseImaAdsParams): UseImaAdsResult {
  const [state, setState] = useState<AdBreakState>(() => createBreakState(mediaKey));
  const sessionRef = useRef<BreakSession | null>(null);
  const startedKeyRef = useRef<string | null>(null);
  const pauseContentRef = useRef(pauseContent);
  const resumeContentRef = useRef(resumeContent);
  const outputVolume = isMuted ? 0 : volume;
  const outputVolumeRef = useRef(outputVolume);

  pauseContentRef.current = pauseContent;
  resumeContentRef.current = resumeContent;

  const view = state.mediaKey === mediaKey ? state : createBreakState(mediaKey);
  const phase = view.phase ?? phaseFromSchedule(schedule);
  const isAdActive = ACTIVE_PHASES.includes(phase);
  const isStarting = phase === "starting";

  const setPhase = useCallback(
    (nextPhase: AdPhase, changes: Partial<AdBreakState> = {}) => {
      setState((previous) => ({
        ...(previous.mediaKey === mediaKey ? previous : createBreakState(mediaKey)),
        phase: nextPhase,
        ...changes,
      }));
    },
    [mediaKey]
  );

  useEffect(() => {
    outputVolumeRef.current = outputVolume;
    sessionRef.current?.controller?.setVolume(outputVolume);
  }, [outputVolume]);

  // A new title (or leaving the page) cancels whatever break was in flight.
  useEffect(
    () => () => {
      sessionRef.current?.cancel();
      sessionRef.current = null;
      startedKeyRef.current = null;
    },
    [mediaKey]
  );

  // Preload the ad shortly before its cue, while the movie keeps playing.
  useEffect(() => {
    if (schedule.status !== "scheduled" || startedKeyRef.current === mediaKey) {
      return;
    }

    const { cueSec, config, analytics } = schedule;

    if (currentTimeSec < cueSec - AD_REQUEST_LEAD_SEC) {
      return;
    }

    startedKeyRef.current = mediaKey;

    if (currentTimeSec >= cueSec + AD_READY_GRACE_SEC) {
      // The viewer jumped past the cue. The moment is gone, so skip the ad.
      setPhase("done");
      return;
    }

    let isCancelled = false;
    const session: BreakSession = {
      controller: null,
      isReleased: false,
      releasedAt: 0,
      cancel: () => {
        isCancelled = true;
        session.controller?.destroy();
      },
    };

    sessionRef.current = session;

    function endBreak(): void {
      sessionRef.current = null;
      setPhase("done", { info: null, progress: null });

      if (session.isReleased) {
        resumeContentRef.current();
      }
    }

    function handleEvent(event: AdControllerEvent): void {
      if (isCancelled) {
        return;
      }

      analytics.recordControllerEvent(event);

      switch (event.type) {
        case "ready":
          setPhase("ready");
          break;
        case "awaitingTap":
          setPhase("awaitingTap");
          break;
        case "loaded":
          setPhase(session.isReleased ? "starting" : "requesting", { info: event.info });
          break;
        case "started":
          recordAdShown(getBrowserAdStorage(), mediaKey, Date.now());
          analytics.recordWait(performance.now() - session.releasedAt);
          setPhase("playing", { info: event.info });
          break;
        case "progress":
          setState((previous) => ({ ...previous, progress: event.progress }));
          break;
        case "paused":
          if (session.isReleased) {
            setPhase("paused");
          }
          break;
        case "resumed":
          setPhase("playing");
          break;
        case "ended":
          endBreak();
          break;
        case "failed":
          recordAdFailure(getBrowserAdStorage(), Date.now());
          endBreak();
          break;
        default:
          break;
      }
    }

    async function preload(): Promise<void> {
      const sdkStartedAt = performance.now();
      let ima: ImaSdk;

      setPhase("requesting");

      try {
        ima = await loadImaSdk();
      } catch (error) {
        if (!isCancelled) {
          analytics.recordSdkFailure(error instanceof AdSdkError ? error.reason : "sdk_blocked");
          recordAdFailure(getBrowserAdStorage(), Date.now());
          endBreak();
        }

        return;
      }

      const adContainer = adContainerRef.current;
      const adVideoElement = adVideoRef.current;
      const contentElement = contentVideoRef.current;

      if (isCancelled) {
        return;
      }

      if (!adContainer || !adVideoElement || !contentElement) {
        endBreak();
        return;
      }

      const controller = createAdsController({
        ima,
        adContainer,
        adVideoElement,
        contentElement,
        tagUrl: config.tagUrl,
        requestTimeoutMs: config.requestTimeoutMs,
        canAutoStart: canAutoStartAds(readAutoplayEnvironment()),
        volume: outputVolumeRef.current,
        locale: readLocale(),
      });

      session.controller = controller;
      controller.subscribe(handleEvent);
      analytics.recordRequest(performance.now() - sdkStartedAt);
      controller.request();
    }

    void preload();
  }, [schedule, mediaKey, currentTimeSec, setPhase, adContainerRef, adVideoRef, contentVideoRef]);

  // The cue is reached with the ad ready: pause the movie and play the ad.
  useEffect(() => {
    const session = sessionRef.current;

    if (
      phase !== "ready" ||
      schedule.status !== "scheduled" ||
      !session?.controller ||
      session.isReleased ||
      !isContentPlaying ||
      currentTimeSec < schedule.cueSec
    ) {
      return;
    }

    session.isReleased = true;
    session.releasedAt = performance.now();
    pauseContentRef.current();
    setPhase("starting");
    session.controller.release();
  }, [phase, schedule, isContentPlaying, currentTimeSec, setPhase]);

  // The ad took too long to load: drop it quietly, the viewer never saw it.
  useEffect(() => {
    const session = sessionRef.current;

    if (
      phase !== "requesting" ||
      schedule.status !== "scheduled" ||
      !session ||
      session.isReleased ||
      currentTimeSec < schedule.cueSec + AD_READY_GRACE_SEC
    ) {
      return;
    }

    session.cancel();
    sessionRef.current = null;
    recordAdFailure(getBrowserAdStorage(), Date.now());
    schedule.analytics.recordControllerEvent({
      type: "failed",
      reason: "request_timeout",
      code: null,
      message: "Ad was not ready at its cue point",
    });
    setPhase("done");
  }, [phase, schedule, currentTimeSec, setPhase]);

  useEffect(() => {
    const adContainer = adContainerRef.current;

    if (!isAdActive || !adContainer) {
      return;
    }

    const observer = new ResizeObserver(() => {
      sessionRef.current?.controller?.resize(adContainer.clientWidth, adContainer.clientHeight, isFullscreen);
    });

    observer.observe(adContainer);

    return () => observer.disconnect();
  }, [isAdActive, isFullscreen, adContainerRef]);

  const startFromTap = useCallback(() => sessionRef.current?.controller?.startFromGesture(), []);
  const resumeAd = useCallback(() => sessionRef.current?.controller?.resume(), []);
  const pauseAd = useCallback(() => sessionRef.current?.controller?.pause(), []);
  const skip = useCallback(() => sessionRef.current?.controller?.skip(), []);

  const ad = useMemo(
    () => (isAdActive && view.info ? buildAdViewState(view.info, view.progress) : null),
    [isAdActive, view.info, view.progress]
  );

  return {
    cueMarkerSec:
      schedule.status === "scheduled" && CUE_MARKER_PHASES.includes(phase) ? schedule.cueSec : null,
    isAdBreak: isStarting || isAdActive,
    isStarting,
    isAdActive,
    isAdPlaying: phase === "playing",
    needsTap: phase === "awaitingTap",
    isPaused: phase === "paused",
    ad,
    startFromTap,
    resumeAd,
    pauseAd,
    skip,
  };
}
