import { describe, expect, it } from "vitest";

import {
  createConfirmationCounter,
  DOCKED_PANEL_MIN_SHRINK_PX,
  isDesktopClass,
  isInspectShortcut,
  isPanelDockedSince,
  type KeyEventLike,
  type ViewportMetrics,
} from "@/lib/security/devtoolsSignals";

const BASELINE: ViewportMetrics = {
  innerWidth: 1400,
  innerHeight: 800,
  outerWidth: 1440,
  outerHeight: 900,
  devicePixelRatio: 1,
};

function key(overrides: Partial<KeyEventLike> & { key: string }): KeyEventLike {
  return { ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...overrides };
}

describe("isInspectShortcut", () => {
  it("blocks F12 and the DevTools chords on Windows/Linux and macOS", () => {
    expect(isInspectShortcut(key({ key: "F12" }))).toBe(true);
    expect(isInspectShortcut(key({ key: "I", ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(isInspectShortcut(key({ key: "J", ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(isInspectShortcut(key({ key: "C", metaKey: true, shiftKey: true }))).toBe(true);
    expect(isInspectShortcut(key({ key: "i", metaKey: true, altKey: true }))).toBe(true);
  });

  it("blocks view-source", () => {
    expect(isInspectShortcut(key({ key: "u", ctrlKey: true }))).toBe(true);
    expect(isInspectShortcut(key({ key: "u", metaKey: true, altKey: true }))).toBe(true);
  });

  it("leaves ordinary typing and editing shortcuts alone", () => {
    expect(isInspectShortcut(key({ key: "i" }))).toBe(false);
    expect(isInspectShortcut(key({ key: "c", ctrlKey: true }))).toBe(false);
    expect(isInspectShortcut(key({ key: "v", ctrlKey: true }))).toBe(false);
    expect(isInspectShortcut(key({ key: "I", shiftKey: true }))).toBe(false);
    expect(isInspectShortcut(key({ key: "F11" }))).toBe(false);
  });
});

describe("isPanelDockedSince", () => {
  it("detects a panel docked at the bottom or side while window and zoom stay fixed", () => {
    expect(isPanelDockedSince(BASELINE, { ...BASELINE, innerHeight: 800 - DOCKED_PANEL_MIN_SHRINK_PX })).toBe(true);
    expect(isPanelDockedSince(BASELINE, { ...BASELINE, innerWidth: 1400 - 500 })).toBe(true);
  });

  it("ignores shrinks smaller than the threshold", () => {
    expect(isPanelDockedSince(BASELINE, { ...BASELINE, innerHeight: 800 - (DOCKED_PANEL_MIN_SHRINK_PX - 1) })).toBe(false);
  });

  it("ignores window resizes", () => {
    expect(isPanelDockedSince(BASELINE, { ...BASELINE, outerWidth: 900, innerWidth: 860 })).toBe(false);
  });

  it("ignores browser zoom", () => {
    expect(isPanelDockedSince(BASELINE, { ...BASELINE, devicePixelRatio: 1.5, innerWidth: 933, innerHeight: 533 })).toBe(false);
  });

  it("ignores a static sidebar that was already open when the baseline was taken", () => {
    const withSidebar: ViewportMetrics = { ...BASELINE, innerWidth: 1000 };

    expect(isPanelDockedSince(withSidebar, withSidebar)).toBe(false);
  });
});

describe("createConfirmationCounter", () => {
  it("only reports after the required consecutive positives", () => {
    const counter = createConfirmationCounter(3);

    expect([counter.record(true), counter.record(true), counter.record(true)]).toEqual([false, false, true]);
  });

  it("resets the streak on a negative observation", () => {
    const counter = createConfirmationCounter(2);

    expect([counter.record(true), counter.record(false), counter.record(true), counter.record(true)]).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });
});

describe("isDesktopClass", () => {
  it("requires a fine pointer and hover, which touch-first devices lack", () => {
    expect(isDesktopClass({ hasFinePointer: true, canHover: true })).toBe(true);
    expect(isDesktopClass({ hasFinePointer: false, canHover: false })).toBe(false);
    expect(isDesktopClass({ hasFinePointer: true, canHover: false })).toBe(false);
  });
});
