import type { google } from "@alugha/ima";
import { AD_PROGRESS_INTERVAL_MS, AD_START_TIMEOUT_MS } from "./constants";
import type {
  AdControllerEvent,
  AdControllerListener,
  AdEndReason,
  AdFailReason,
  AdInfo,
  ImaSdk,
} from "./types";

const AD_MEDIA_LOAD_TIMEOUT_MS = 8_000;
const FALLBACK_SLOT_WIDTH = 640;
const FALLBACK_SLOT_HEIGHT = 360;
const TIMEOUT_GRACE_MS = 1_000;

export interface AdsControllerOptions {
  ima: ImaSdk;
  /** Element IMA renders the ad (and its own UI) into. */
  adContainer: HTMLElement;
  /** Element IMA uses for ad playback on platforms without multiple video elements. */
  adVideoElement: HTMLVideoElement;
  /** Passed to IMA as the content player; it is never played or paused by the controller. */
  contentElement: HTMLVideoElement;
  tagUrl: string;
  requestTimeoutMs: number;
  /** True when the browser lets the ad start without a tap. */
  canAutoStart: boolean;
  /** Initial output volume, 0 to 1. */
  volume: number;
  /** Two-letter language for IMA's own labels. */
  locale: string;
}

export interface AdsController {
  subscribe(listener: AdControllerListener): () => void;
  /** Loads the ad in the background. Emits `ready` once it can start instantly. */
  request(): void;
  /** The ad is due: start it now, or as soon as it is ready. */
  release(): void;
  /** Call from a tap handler when `awaitingTap` was emitted. */
  startFromGesture(): void;
  skip(): void;
  resume(): void;
  pause(): void;
  setVolume(volume: number): void;
  resize(width: number, height: number, isFullscreen: boolean): void;
  destroy(): void;
}

interface FailureDetails {
  reason: AdFailReason;
  code: number | null;
  message: string;
}

export function classifyAdError(ima: ImaSdk, code: number): AdFailReason {
  const codes = ima.AdError.ErrorCode;

  if (code === codes.VAST_EMPTY_RESPONSE || code === codes.VAST_NO_ADS_AFTER_WRAPPER) {
    return "no_fill";
  }

  if (code === codes.VAST_LOAD_TIMEOUT || code === codes.VAST_MEDIA_LOAD_TIMEOUT) {
    return "request_timeout";
  }

  return "ad_error";
}

function isCustomUiAllowed(ad: google.ima.Ad): boolean {
  // Custom ad UI is a newer IMA feature that the bundled typings do not describe yet.
  if (!("isUiDisabled" in ad) || typeof ad.isUiDisabled !== "function") {
    return false;
  }

  return ad.isUiDisabled() === true;
}

function buildAdInfo(ad: google.ima.Ad): AdInfo {
  const skipOffset = ad.getSkipTimeOffset();
  const podInfo = ad.getAdPodInfo();
  const isSkippable = skipOffset >= 0;

  return {
    isSkippable,
    skipOffsetSec: isSkippable ? skipOffset : null,
    durationSec: Math.max(0, ad.getDuration()),
    canUseCustomUi: isCustomUiAllowed(ad),
    podIndex: podInfo.getAdPosition(),
    podTotal: podInfo.getTotalAds(),
  };
}

/**
 * Owns one ad break: preload, playback, skip, and teardown. It talks to IMA only and knows
 * nothing about React or the content player.
 *
 * Contract: exactly one terminal event (`ended` or `failed`) is emitted, after which the IMA
 * objects are destroyed and no further events are delivered. Every failure path ends here so
 * the player can resume content.
 */
export function createAdsController(options: AdsControllerOptions): AdsController {
  const { ima, adContainer } = options;
  const listeners = new Set<AdControllerListener>();

  ima.settings.setLocale(options.locale);

  const displayContainer = new ima.AdDisplayContainer(adContainer, options.adVideoElement);
  const loader = new ima.AdsLoader(displayContainer);

  let manager: google.ima.AdsManager | null = null;
  let currentAd: AdInfo | null = null;
  let volume = options.volume;
  let isGestureDone = false;
  let isReleased = false;
  let isStarted = false;
  let isFinished = false;
  let hasTornDown = false;
  let endReason: AdEndReason = "completed";
  let elapsedSec = 0;
  let requestTimer: number | undefined;
  let startTimer: number | undefined;
  let progressTimer: number | undefined;

  function emit(event: AdControllerEvent): void {
    if (isFinished && event.type !== "ended" && event.type !== "failed") {
      return;
    }

    listeners.forEach((listener) => listener(event));
  }

  function clearTimers(): void {
    window.clearTimeout(requestTimer);
    window.clearTimeout(startTimer);
    window.clearInterval(progressTimer);
  }

  function teardown(): void {
    if (hasTornDown) {
      return;
    }

    hasTornDown = true;
    clearTimers();

    try {
      manager?.destroy();
      loader.destroy();
      displayContainer.destroy();
    } catch {
      // Intentional: SDK teardown is best effort. Playback has already been handed back.
    }
  }

  function finish(event: AdControllerEvent): void {
    if (isFinished) {
      return;
    }

    emit(event);
    isFinished = true;
    teardown();
  }

  function fail({ reason, code, message }: FailureDetails): void {
    finish({ type: "failed", reason, code, message });
  }

  function end(): void {
    finish({
      type: "ended",
      reason: endReason,
      watchedSec: endReason === "completed" ? (currentAd?.durationSec ?? elapsedSec) : elapsedSec,
    });
  }

  function armStartTimer(): void {
    window.clearTimeout(startTimer);
    startTimer = window.setTimeout(
      () => fail({ reason: "start_timeout", code: null, message: "Ad did not start in time" }),
      AD_START_TIMEOUT_MS
    );
  }

  function readSlotSize(): { width: number; height: number } {
    return {
      width: adContainer.clientWidth || FALLBACK_SLOT_WIDTH,
      height: adContainer.clientHeight || FALLBACK_SLOT_HEIGHT,
    };
  }

  function pollProgress(): void {
    if (!manager || !currentAd) {
      return;
    }

    const remainingSec = manager.getRemainingTime();

    if (remainingSec < 0) {
      return;
    }

    elapsedSec = Math.max(0, currentAd.durationSec - remainingSec);
    emit({
      type: "progress",
      progress: {
        elapsedSec,
        remainingSec,
        durationSec: currentAd.durationSec,
        isSkippableNow: manager.getAdSkippableState(),
      },
    });
  }

  function begin(): void {
    if (!manager || isStarted || !isReleased) {
      return;
    }

    const { width, height } = readSlotSize();

    try {
      manager.init(width, height, ima.ViewMode.NORMAL);
      manager.setVolume(volume);
      manager.start();
      armStartTimer();
    } catch (error) {
      fail({
        reason: "ad_error",
        code: null,
        message: error instanceof Error ? error.message : "Ad manager failed to start",
      });
    }
  }

  function handleStarted(ad: google.ima.Ad | null): void {
    if (ad) {
      currentAd = buildAdInfo(ad);
    }

    if (!currentAd) {
      return;
    }

    isStarted = true;
    window.clearTimeout(startTimer);
    window.clearInterval(progressTimer);
    progressTimer = window.setInterval(pollProgress, AD_PROGRESS_INTERVAL_MS);
    emit({ type: "started", info: currentAd });
  }

  function handleAdError(event: google.ima.AdErrorEvent): void {
    const error = event.getError();
    const code = error.getErrorCode();

    fail({ reason: classifyAdError(ima, code), code, message: error.getMessage() });
  }

  function attachManagerEvents(adsManager: google.ima.AdsManager): void {
    const eventTypes = ima.AdEvent.Type;
    const handlers: ReadonlyArray<[google.ima.AdEvent.Type, (event: google.ima.AdEvent) => void]> = [
      [
        eventTypes.LOADED,
        (event) => {
          const ad = event.getAd();

          if (ad) {
            currentAd = buildAdInfo(ad);
            emit({ type: "loaded", info: currentAd });
          }
        },
      ],
      [eventTypes.STARTED, (event) => handleStarted(event.getAd())],
      [eventTypes.IMPRESSION, () => emit({ type: "impression" })],
      [eventTypes.FIRST_QUARTILE, () => emit({ type: "quartile", quartile: 25 })],
      [eventTypes.MIDPOINT, () => emit({ type: "quartile", quartile: 50 })],
      [eventTypes.THIRD_QUARTILE, () => emit({ type: "quartile", quartile: 75 })],
      [eventTypes.COMPLETE, () => emit({ type: "quartile", quartile: 100 })],
      [
        eventTypes.SKIPPED,
        () => {
          endReason = "skipped";
        },
      ],
      [eventTypes.PAUSED, () => {
        if (isStarted) {
          emit({ type: "paused" });
        }
      }],
      [eventTypes.RESUMED, () => emit({ type: "resumed" })],
      [eventTypes.CLICK, () => emit({ type: "clicked" })],
      [eventTypes.CONTENT_RESUME_REQUESTED, end],
      [eventTypes.ALL_ADS_COMPLETED, end],
      [eventTypes.USER_CLOSE, end],
    ];

    handlers.forEach(([type, handler]) => adsManager.addEventListener(type, handler));
    adsManager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, handleAdError);
  }

  function handleManagerLoaded(event: google.ima.AdsManagerLoadedEvent): void {
    window.clearTimeout(requestTimer);

    const settings = new ima.AdsRenderingSettings();
    settings.enablePreloading = true;
    settings.restoreCustomPlaybackStateOnAdBreakComplete = true;
    settings.loadVideoTimeout = AD_MEDIA_LOAD_TIMEOUT_MS;
    // Lets ads that allow it hand the skip button and progress bar to the player UI.
    Object.assign(settings, { disableUi: true });

    manager = event.getAdsManager(options.contentElement, settings);
    attachManagerEvents(manager);
    emit({ type: "ready" });

    if (isReleased) {
      startOrAskForTap();
    }
  }

  function startOrAskForTap(): void {
    if (isGestureDone) {
      begin();
      return;
    }

    window.clearTimeout(startTimer);
    emit({ type: "awaitingTap" });
  }

  loader.addEventListener(ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, handleManagerLoaded);
  loader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, handleAdError);

  if (options.canAutoStart) {
    displayContainer.initialize();
    isGestureDone = true;
  }

  return {
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    request() {
      const { width, height } = readSlotSize();
      const adsRequest = new ima.AdsRequest();

      adsRequest.adTagUrl = options.tagUrl;
      adsRequest.linearAdSlotWidth = width;
      adsRequest.linearAdSlotHeight = height;
      adsRequest.vastLoadTimeout = options.requestTimeoutMs;
      adsRequest.setAdWillAutoPlay(options.canAutoStart);
      adsRequest.setAdWillPlayMuted(volume === 0);

      emit({ type: "requested" });
      requestTimer = window.setTimeout(
        () => fail({ reason: "request_timeout", code: null, message: "Ad request timed out" }),
        options.requestTimeoutMs + TIMEOUT_GRACE_MS
      );
      loader.requestAds(adsRequest);
    },

    release() {
      if (isReleased || isFinished) {
        return;
      }

      isReleased = true;

      if (manager) {
        startOrAskForTap();
      }
    },

    startFromGesture() {
      if (isGestureDone || isFinished) {
        return;
      }

      displayContainer.initialize();
      isGestureDone = true;
      begin();
    },

    skip() {
      if (manager && isStarted && manager.getAdSkippableState()) {
        manager.skip();
      }
    },

    resume() {
      if (manager && isStarted) {
        try {
          manager.resume();
        } catch {
          // Best effort resume
        }
      }
    },

    pause() {
      if (manager && isStarted) {
        try {
          manager.pause();
        } catch {
          // Best effort pause
        }
      }
    },

    setVolume(nextVolume) {
      volume = nextVolume;
      manager?.setVolume(nextVolume);
    },

    resize(width, height, isFullscreen) {
      manager?.resize(
        width,
        height,
        isFullscreen ? ima.ViewMode.FULLSCREEN : ima.ViewMode.NORMAL
      );
    },

    destroy() {
      isFinished = true;
      teardown();
    },
  };
}
