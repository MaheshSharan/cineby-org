// Pure decision logic for the DevTools guard. No browser APIs are touched here, so every rule is unit-testable.
//
// Detection is deliberately conservative. Earlier attempts (console getter traps, main-thread `debugger`
// timing, absolute viewport deltas) kicked legitimate phones and desktops. This module only accepts signals
// that normal browsing cannot produce: a panel docking while the window and zoom stay constant, and a
// dedicated worker stuck on a `debugger` statement.

/** A docked panel must shrink the viewport by at least this many CSS pixels to count. */
export const DOCKED_PANEL_MIN_SHRINK_PX = 200;

/** Consecutive polls that must agree before a docked panel is reported (filters transient layout shifts). */
export const DOCKED_PANEL_CONFIRMATIONS = 3;

/** A worker held on `debugger` for longer than this is paused by a debugger, not by a scheduling hiccup. */
export const WORKER_PAUSE_THRESHOLD_MS = 1500;

/** Separate pauses required before the worker signal is reported. */
export const WORKER_PAUSE_CONFIRMATIONS = 2;

export interface ViewportMetrics {
  innerWidth: number;
  innerHeight: number;
  outerWidth: number;
  outerHeight: number;
  devicePixelRatio: number;
}

export interface InputCapabilities {
  hasFinePointer: boolean;
  canHover: boolean;
}

/** Touch-first devices never run the guard: mobile browsers resize the viewport constantly. */
export function isDesktopClass({ hasFinePointer, canHover }: InputCapabilities): boolean {
  return hasFinePointer && canHover;
}

/** A resize or a zoom change invalidates the baseline: the viewport legitimately changed shape. */
export function hasWindowOrZoomChanged(baseline: ViewportMetrics, current: ViewportMetrics): boolean {
  return (
    current.outerWidth !== baseline.outerWidth ||
    current.outerHeight !== baseline.outerHeight ||
    current.devicePixelRatio !== baseline.devicePixelRatio
  );
}

/**
 * True when the viewport shrank while the window itself and the zoom level did not change, which is what
 * docking DevTools (bottom, side) looks like. Browser zoom changes devicePixelRatio and a window resize
 * changes the outer size, so neither can match.
 */
export function isPanelDockedSince(baseline: ViewportMetrics, current: ViewportMetrics): boolean {
  if (hasWindowOrZoomChanged(baseline, current)) {
    return false;
  }

  const widthShrink = baseline.innerWidth - current.innerWidth;
  const heightShrink = baseline.innerHeight - current.innerHeight;

  return Math.max(widthShrink, heightShrink) >= DOCKED_PANEL_MIN_SHRINK_PX;
}

export interface ConfirmationCounter {
  /** Records one observation and returns true once enough consecutive positives have been seen. */
  record: (isPositive: boolean) => boolean;
}

/** A negative observation resets the streak, so isolated positives never accumulate into a verdict. */
export function createConfirmationCounter(required: number): ConfirmationCounter {
  let streak = 0;

  return {
    record(isPositive) {
      streak = isPositive ? streak + 1 : 0;

      return streak >= required;
    },
  };
}

export interface KeyEventLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

const INSPECT_KEYS_WITH_SHIFT = new Set(["i", "j", "c", "k", "e"]);
const INSPECT_KEYS_WITH_ALT = new Set(["i", "j", "c", "u"]);

/**
 * DevTools and view-source shortcuts: F12, Ctrl/Cmd+Shift+I/J/C/K/E (Windows, Linux), Cmd+Opt+I/J/C/U (macOS),
 * and Ctrl+U (view source).
 */
export function isInspectShortcut(event: KeyEventLike): boolean {
  const key = event.key.toLowerCase();

  if (key === "f12") {
    return true;
  }

  const hasCommandKey = event.ctrlKey || event.metaKey;

  if (!hasCommandKey) {
    return false;
  }

  if (event.shiftKey && INSPECT_KEYS_WITH_SHIFT.has(key)) {
    return true;
  }

  if (event.metaKey && event.altKey && INSPECT_KEYS_WITH_ALT.has(key)) {
    return true;
  }

  return key === "u" && !event.shiftKey && !event.altKey;
}
