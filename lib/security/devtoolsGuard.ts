/**
 * Multi-vector client-side DevTools protection.
 *
 * Runs only in the browser and when enabled.
 * If DevTools inspection is detected, it wipes sensitive state and redirects
 * immediately to "about:blank".
 */

export interface DevtoolsGuardOptions {
  enabled?: boolean;
  redirectUrl?: string;
  onDetect?: () => void;
  checkIntervalMs?: number;
}

const DEFAULT_REDIRECT_URL = "about:blank";
const TIMING_THRESHOLD_MS = 250;
const DIMENSION_THRESHOLD_PX = 320;
const REQUIRED_CONSECUTIVE_HITS = 2;

/**
 * Executes neutralization: clears document content and redirects.
 */
export function triggerDevtoolsNeutralization(redirectUrl: string = DEFAULT_REDIRECT_URL): void {
  if (typeof window === "undefined") return;

  try {
    // 1. Clear session and storage tokens in memory if accessible
    window.sessionStorage?.clear();
  } catch {
    // Ignore storage access errors
  }

  try {
    // 2. Wipe DOM to prevent reading elements from DOM inspector
    if (document.documentElement) {
      document.documentElement.innerHTML = "";
    }
  } catch {
    // Ignore DOM manipulation errors
  }

  // 3. Immediate navigation replacement
  try {
    window.location.replace(redirectUrl);
  } catch {
    window.location.href = redirectUrl;
  }
}

/**
 * Check 1: Timing delta via debugger execution.
 * When DevTools is closed, `debugger` statement execution takes < 5-10ms.
 * When DevTools is open, debugger pause/hook introduces >= 250ms delta.
 */
export function checkDebuggerTiming(thresholdMs: number = TIMING_THRESHOLD_MS): boolean {
  if (typeof window === "undefined") return false;

  const start = performance.now();
  // eslint-disable-next-line no-debugger
  debugger;
  const delta = performance.now() - start;

  return delta >= thresholdMs;
}

/**
 * Check 2: Window dimension delta (docked DevTools check).
 * Compares outer and inner window dimensions.
 * Guards against mobile pinch/zoom where innerWidth can differ normally without DevTools.
 */
export function checkDimensionDelta(thresholdPx: number = DIMENSION_THRESHOLD_PX): boolean {
  if (typeof window === "undefined") return false;

  const widthDiff = window.outerWidth - window.innerWidth;
  const heightDiff = window.outerHeight - window.innerHeight;

  // Ignore zoomed/pinch states on touch devices
  const isTouchDevice =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0;

  if (isTouchDevice) {
    return false;
  }

  return widthDiff > thresholdPx || heightDiff > thresholdPx;
}

/**
 * Check 3: Console getter trap.
 * DevTools evaluates getters when expanding or printing objects to console.
 */
export function createConsoleTrap(onTrigger: () => void): { trap: () => void } {
  let detected = false;

  const element = typeof Image !== "undefined" ? new Image() : {};
  Object.defineProperty(element, "id", {
    get: () => {
      detected = true;
      onTrigger();
      return "";
    },
    configurable: true,
  });

  const regExp = /./;
  regExp.toString = () => {
    detected = true;
    onTrigger();
    return "";
  };

  const trap = () => {
    if (detected) return;
    try {
      console.debug(element);
      console.dir(regExp);
    } catch {
      // Ignore console inspection errors
    }
  };

  return { trap };
}

/**
 * Starts continuous multi-vector DevTools monitoring.
 * Returns a teardown function to stop checks.
 */
export function initDevtoolsGuard(options: DevtoolsGuardOptions = {}): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const {
    enabled = process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_DEVTOOLS_GUARD_ENABLED === "true",
    redirectUrl = DEFAULT_REDIRECT_URL,
    onDetect = () => triggerDevtoolsNeutralization(redirectUrl),
    checkIntervalMs = 500,
  } = options;

  if (!enabled) {
    return () => {};
  }

  let isDestroyed = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let rafId: number | null = null;
  let consecutiveHits = 0;
  const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();

  const recordHit = () => {
    consecutiveHits += 1;
    if (consecutiveHits >= REQUIRED_CONSECUTIVE_HITS) {
      if (isDestroyed) return;
      isDestroyed = true;
      if (intervalId) clearInterval(intervalId);
      if (rafId !== null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(rafId);
      }
      onDetect();
    }
  };

  const recordClear = () => {
    consecutiveHits = 0;
  };

  const { trap: triggerConsoleTrap } = createConsoleTrap(recordHit);

  const runAllChecks = () => {
    if (isDestroyed) return;

    // Grace period: ignore during first 1.5s of page load/hydration to prevent CPU spike false positives
    const elapsed = (typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime;
    if (elapsed < 1500) {
      return;
    }

    if (checkDebuggerTiming()) {
      recordHit();
      return;
    }

    recordClear();
    triggerConsoleTrap();
  };

  // High-frequency check using requestAnimationFrame with randomized micro-jitter
  const scheduleRafCheck = () => {
    if (isDestroyed) return;
    if (typeof requestAnimationFrame !== "function") return;

    rafId = requestAnimationFrame(() => {
      runAllChecks();
      if (!isDestroyed) {
        // Random jitter (between 200ms and 600ms) to evade straightforward periodic monkeypatches
        const nextDelay = 200 + Math.random() * 400;
        setTimeout(scheduleRafCheck, nextDelay);
      }
    });
  };

  // Primary heartbeat interval
  intervalId = setInterval(runAllChecks, checkIntervalMs);
  scheduleRafCheck();

  // Resize listener for docked devtools detection (evaluated only on actual user resize)
  const onResize = () => {
    if (checkDimensionDelta()) {
      recordHit();
    } else {
      recordClear();
    }
  };

  window.addEventListener("resize", onResize, { passive: true });

  return () => {
    isDestroyed = true;
    if (intervalId) clearInterval(intervalId);
    if (rafId !== null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(rafId);
    }
    window.removeEventListener("resize", onResize);
  };
}
