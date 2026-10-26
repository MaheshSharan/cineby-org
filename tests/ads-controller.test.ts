import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { classifyAdError, createAdsController, type AdsControllerOptions } from "@/lib/ads/controller";
import { AD_START_TIMEOUT_MS } from "@/lib/ads/constants";
import type { AdControllerEvent, ImaSdk } from "@/lib/ads/types";

type Handler = (event: unknown) => void;

class FakeEmitter {
  private readonly handlers = new Map<string, Handler[]>();

  addEventListener(type: string, handler: Handler): void {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), handler]);
  }

  fire(type: string, event: unknown = {}): void {
    (this.handlers.get(type) ?? []).forEach((handler) => handler(event));
  }
}

class FakeManager extends FakeEmitter {
  calls: string[] = [];
  isSkippable = false;
  remainingSec = 30;

  init = () => this.calls.push("init");
  start = () => this.calls.push("start");
  destroy = () => this.calls.push("destroy");
  pause = () => this.calls.push("pause");
  resume = () => this.calls.push("resume");
  setVolume = (volume: number) => this.calls.push(`volume:${volume}`);
  resize = () => this.calls.push("resize");
  skip = () => {
    this.calls.push("skip");
    this.fire("skip");
  };
  getAdSkippableState = () => this.isSkippable;
  getRemainingTime = () => this.remainingSec;
}

const FAKE_AD = {
  getSkipTimeOffset: () => 5,
  getDuration: () => 30,
  getAdPodInfo: () => ({ getAdPosition: () => 1, getTotalAds: () => 1 }),
  isUiDisabled: () => true,
};

function setup(overrides: Partial<AdsControllerOptions> = {}) {
  const manager = new FakeManager();
  const loader = new FakeEmitter();
  const loaderCalls: string[] = [];
  const containerCalls: string[] = [];

  const ima = {
    settings: { setLocale: vi.fn() },
    AdDisplayContainer: class {
      initialize = () => containerCalls.push("initialize");
      destroy = () => containerCalls.push("destroy");
    },
    AdsLoader: class {
      addEventListener = loader.addEventListener.bind(loader);
      requestAds = () => loaderCalls.push("requestAds");
      destroy = () => loaderCalls.push("destroy");
    },
    AdsRequest: class {
      setAdWillAutoPlay = vi.fn();
      setAdWillPlayMuted = vi.fn();
    },
    AdsRenderingSettings: class {},
    AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: "adsManagerLoaded" } },
    AdErrorEvent: { Type: { AD_ERROR: "adError" } },
    AdEvent: {
      Type: {
        LOADED: "loaded",
        STARTED: "start",
        IMPRESSION: "impression",
        FIRST_QUARTILE: "firstQuartile",
        MIDPOINT: "midpoint",
        THIRD_QUARTILE: "thirdQuartile",
        COMPLETE: "complete",
        SKIPPED: "skip",
        PAUSED: "pause",
        RESUMED: "resume",
        CLICK: "click",
        CONTENT_RESUME_REQUESTED: "contentResumeRequested",
        ALL_ADS_COMPLETED: "allAdsCompleted",
        USER_CLOSE: "userClose",
      },
    },
    AdError: {
      ErrorCode: {
        VAST_EMPTY_RESPONSE: 1009,
        VAST_NO_ADS_AFTER_WRAPPER: 303,
        VAST_LOAD_TIMEOUT: 301,
        VAST_MEDIA_LOAD_TIMEOUT: 402,
      },
    },
    ViewMode: { NORMAL: "normal", FULLSCREEN: "fullscreen" },
  } as unknown as ImaSdk;

  const controller = createAdsController({
    ima,
    adContainer: { clientWidth: 800, clientHeight: 450 } as HTMLElement,
    adVideoElement: {} as HTMLVideoElement,
    contentElement: {} as HTMLVideoElement,
    tagUrl: "https://ads.test/vast",
    requestTimeoutMs: 5000,
    canAutoStart: true,
    volume: 0.8,
    locale: "en",
    ...overrides,
  });
  const events: AdControllerEvent[] = [];

  controller.subscribe((event) => events.push(event));

  function deliverManager(): void {
    loader.fire("adsManagerLoaded", { getAdsManager: () => manager });
  }

  function fireAd(type: string): void {
    manager.fire(type, { getAd: () => FAKE_AD });
  }

  return { controller, manager, loader, events, loaderCalls, containerCalls, deliverManager, fireAd };
}

function types(events: AdControllerEvent[]): string[] {
  return events.map((event) => event.type);
}

describe("createAdsController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", globalThis);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("preloads without playing, then starts the moment it is released", () => {
    const { controller, manager, events, containerCalls, deliverManager, fireAd } = setup();

    controller.request();
    deliverManager();

    expect(types(events)).toEqual(["requested", "ready"]);
    expect(manager.calls).toEqual([]);

    controller.release();
    fireAd("loaded");
    fireAd("start");

    expect(containerCalls).toEqual(["initialize"]);
    expect(manager.calls).toEqual(["init", "volume:0.8", "start"]);
    expect(types(events)).toEqual(["requested", "ready", "loaded", "started"]);
    expect(events[2]).toMatchObject({
      info: { isSkippable: true, skipOffsetSec: 5, durationSec: 30, canUseCustomUi: true },
    });
  });

  it("starts as soon as the ad loads when it was released before it was ready", () => {
    const { controller, manager, deliverManager } = setup();

    controller.request();
    controller.release();
    expect(manager.calls).toEqual([]);

    deliverManager();

    expect(manager.calls).toContain("start");
  });

  it("waits for a tap when autoplay is not allowed, then starts", () => {
    const { controller, manager, events, containerCalls, deliverManager } = setup({ canAutoStart: false });

    controller.request();
    deliverManager();
    controller.release();

    expect(types(events)).toEqual(["requested", "ready", "awaitingTap"]);
    expect(manager.calls).toEqual([]);
    expect(containerCalls).toEqual([]);

    controller.startFromGesture();

    expect(containerCalls).toEqual(["initialize"]);
    expect(manager.calls).toContain("start");
  });

  it("does not time out while waiting for the viewer to tap", () => {
    const { controller, events, deliverManager } = setup({ canAutoStart: false });

    controller.request();
    deliverManager();
    controller.release();
    vi.advanceTimersByTime(AD_START_TIMEOUT_MS * 3);

    expect(types(events)).toEqual(["requested", "ready", "awaitingTap"]);
  });

  it("ends exactly once however many end signals IMA sends, and tears down", () => {
    const { controller, manager, events, loaderCalls, containerCalls, deliverManager, fireAd } = setup();

    controller.request();
    deliverManager();
    controller.release();
    fireAd("start");
    manager.fire("contentResumeRequested");
    manager.fire("allAdsCompleted");
    manager.fire("userClose");

    expect(events.filter((event) => event.type === "ended")).toEqual([
      { type: "ended", reason: "completed", watchedSec: 30 },
    ]);
    expect(manager.calls.filter((call) => call === "destroy")).toHaveLength(1);
    expect(loaderCalls).toContain("destroy");
    expect(containerCalls).toContain("destroy");
  });

  it("reports a skip and only skips when the ad allows it", () => {
    const { controller, manager, events, deliverManager, fireAd } = setup();

    controller.request();
    deliverManager();
    controller.release();
    fireAd("start");

    controller.skip();
    expect(manager.calls).not.toContain("skip");

    manager.isSkippable = true;
    controller.skip();
    manager.fire("contentResumeRequested");

    expect(manager.calls).toContain("skip");
    expect(events.at(-1)).toMatchObject({ type: "ended", reason: "skipped" });
  });

  it("publishes progress and the skippable state while playing", () => {
    const { controller, manager, events, deliverManager, fireAd } = setup();

    controller.request();
    deliverManager();
    controller.release();
    fireAd("loaded");
    fireAd("start");
    manager.remainingSec = 20;
    manager.isSkippable = true;
    vi.advanceTimersByTime(300);

    expect(events.at(-1)).toEqual({
      type: "progress",
      progress: { elapsedSec: 10, remainingSec: 20, durationSec: 30, isSkippableNow: true },
    });
  });

  it("fails with no_fill on an empty VAST response and stops delivering events", () => {
    const { controller, loader, events } = setup();

    controller.request();
    loader.fire("adError", { getError: () => ({ getErrorCode: () => 1009, getMessage: () => "empty" }) });
    loader.fire("adError", { getError: () => ({ getErrorCode: () => 400, getMessage: () => "late" }) });

    expect(events).toEqual([
      { type: "requested" },
      { type: "failed", reason: "no_fill", code: 1009, message: "empty" },
    ]);
  });

  it("fails open when the ad request never answers", () => {
    const { controller, events } = setup();

    controller.request();
    vi.advanceTimersByTime(6100);

    expect(events.at(-1)).toMatchObject({ type: "failed", reason: "request_timeout" });
  });

  it("does not time out while a preloaded ad waits for its cue", () => {
    const { controller, events, deliverManager } = setup();

    controller.request();
    deliverManager();
    vi.advanceTimersByTime(AD_START_TIMEOUT_MS * 3);

    expect(types(events)).toEqual(["requested", "ready"]);
  });

  it("fails open when the ad never starts after being released", () => {
    const { controller, events, deliverManager } = setup();

    controller.request();
    deliverManager();
    controller.release();
    vi.advanceTimersByTime(AD_START_TIMEOUT_MS + 100);

    expect(events.at(-1)).toMatchObject({ type: "failed", reason: "start_timeout" });
  });

  it("fails instead of throwing when the manager cannot start", () => {
    const { controller, manager, events, deliverManager } = setup();

    manager.start = () => {
      throw new Error("boom");
    };
    controller.request();
    deliverManager();
    controller.release();

    expect(events.at(-1)).toMatchObject({ type: "failed", reason: "ad_error", message: "boom" });
  });

  it("stays silent after destroy", () => {
    const { controller, manager, events, deliverManager, fireAd } = setup();

    controller.request();
    deliverManager();
    controller.destroy();
    fireAd("start");
    manager.fire("contentResumeRequested");
    vi.advanceTimersByTime(20_000);

    expect(types(events)).toEqual(["requested", "ready"]);
  });
});

describe("classifyAdError", () => {
  it("maps IMA error codes to failure reasons", () => {
    const ima = {
      AdError: {
        ErrorCode: {
          VAST_EMPTY_RESPONSE: 1009,
          VAST_NO_ADS_AFTER_WRAPPER: 303,
          VAST_LOAD_TIMEOUT: 301,
          VAST_MEDIA_LOAD_TIMEOUT: 402,
        },
      },
    } as unknown as ImaSdk;

    expect(classifyAdError(ima, 1009)).toBe("no_fill");
    expect(classifyAdError(ima, 303)).toBe("no_fill");
    expect(classifyAdError(ima, 301)).toBe("request_timeout");
    expect(classifyAdError(ima, 402)).toBe("request_timeout");
    expect(classifyAdError(ima, 400)).toBe("ad_error");
  });
});
