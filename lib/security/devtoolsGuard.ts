// Browser side effects for the DevTools guard. Decisions live in devtoolsSignals.ts.
//
// This is a deterrent, not a security boundary: anything client-side can be bypassed by a determined user.
// Stream protection must stay server-side (signed descriptors, rate limits).

import {
  CONSOLE_PROBE_CONFIRMATIONS,
  createConfirmationCounter,
  DEBUGGER_PAUSE_CONFIRMATIONS,
  DEBUGGER_PAUSE_THRESHOLD_MS,
  DOCKED_PANEL_CONFIRMATIONS,
  hasWindowOrZoomChanged,
  isDesktopClass,
  isInspectShortcut,
  isPanelDockedSince,
  type ViewportMetrics,
} from "./devtoolsSignals";

const VIEWPORT_POLL_INTERVAL_MS = 500;

// Served from public/ because production minifiers strip `debugger` statements from bundled code.
const HEARTBEAT_WORKER_URL = "/devtools-heartbeat.js";
const MAIN_THREAD_HEARTBEAT_URL = "/devtools-main-heartbeat.js";
const CONSOLE_PROBE_INTERVAL_MS = 1000;

// Must match the event names in public/devtools-main-heartbeat.js, which cannot import from the bundle.
const PAUSE_EVENT_NAME = "cineby:debugger-pause";
const STOP_EVENT_NAME = "cineby:debugger-stop";

export function isDesktopBrowser(): boolean {
  return isDesktopClass({
    hasFinePointer: window.matchMedia("(pointer: fine)").matches,
    canHover: window.matchMedia("(hover: hover)").matches,
  });
}

export function redirectToBlankPage(): void {
  document.documentElement.innerHTML = "";
  window.location.replace("about:blank");
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.matches("input, textarea"))
  );
}

/** Blocks inspect shortcuts and the context menu. Right-click stays available in text fields for copy/paste. */
function installShortcutShield(): () => void {
  function handleKeyDown(event: KeyboardEvent): void {
    if (isInspectShortcut(event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function handleContextMenu(event: MouseEvent): void {
    if (!isEditableTarget(event.target)) {
      event.preventDefault();
    }
  }

  window.addEventListener("keydown", handleKeyDown, { capture: true });
  window.addEventListener("contextmenu", handleContextMenu, { capture: true });

  return () => {
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
    window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
  };
}

function readViewportMetrics(): ViewportMetrics {
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    devicePixelRatio: window.devicePixelRatio,
  };
}

/** Detects a docked DevTools panel from a viewport that shrinks while window size and zoom stay fixed. */
function watchDockedPanel(onDetected: () => void): () => void {
  const counter = createConfirmationCounter(DOCKED_PANEL_CONFIRMATIONS);
  let baseline = readViewportMetrics();

  const intervalId = window.setInterval(() => {
    const current = readViewportMetrics();

    if (hasWindowOrZoomChanged(baseline, current)) {
      baseline = current;
      counter.record(false);

      return;
    }

    if (counter.record(isPanelDockedSince(baseline, current))) {
      onDetected();
    }
  }, VIEWPORT_POLL_INTERVAL_MS);

  return () => window.clearInterval(intervalId);
}

function isPauseDuration(data: unknown): data is number {
  return typeof data === "number" && Number.isFinite(data);
}

/** Detects a debugger holding the heartbeat worker on its `debugger` statement. */
function watchDebuggerPauses(onDetected: () => void): () => void {
  const counter = createConfirmationCounter(DEBUGGER_PAUSE_CONFIRMATIONS);
  let worker: Worker;

  try {
    worker = new Worker(HEARTBEAT_WORKER_URL);
  } catch {
    // Workers can be unavailable (restricted browsing contexts). The other signals still apply.
    return () => undefined;
  }

  worker.onmessage = (event: MessageEvent<unknown>) => {
    if (isPauseDuration(event.data) && counter.record(event.data > DEBUGGER_PAUSE_THRESHOLD_MS)) {
      onDetected();
    }
  };

  return () => worker.terminate();
}

/**
 * Detects a debugger pausing the page itself. Unlike the docked-panel check this works when DevTools is
 * undocked or was already open before the page loaded; only "Deactivate breakpoints" (Ctrl+F8) defeats it.
 */
function watchMainThreadPauses(onDetected: () => void): () => void {
  const counter = createConfirmationCounter(DEBUGGER_PAUSE_CONFIRMATIONS);
  const script = document.createElement("script");

  function handlePause(event: Event): void {
    if (
      event instanceof CustomEvent &&
      isPauseDuration(event.detail) &&
      counter.record(event.detail > DEBUGGER_PAUSE_THRESHOLD_MS)
    ) {
      onDetected();
    }
  }

  window.addEventListener(PAUSE_EVENT_NAME, handlePause);
  script.src = MAIN_THREAD_HEARTBEAT_URL;
  document.head.appendChild(script);

  return () => {
    window.dispatchEvent(new Event(STOP_EVENT_NAME));
    window.removeEventListener(PAUSE_EVENT_NAME, handlePause);
    script.remove();
  };
}

/**
 * Logs a DOM element whose `id` getter only runs when a DevTools console formats it. Works for undocked
 * DevTools and does not depend on breakpoints, so it covers the Ctrl+F8 case the debugger signals miss.
 */
function watchConsoleProbe(onDetected: () => void): () => void {
  const counter = createConfirmationCounter(CONSOLE_PROBE_CONFIRMATIONS);

  const intervalId = window.setInterval(() => {
    let wasInspected = false;
    const probe = document.createElement("div");

    Object.defineProperty(probe, "id", {
      get() {
        wasInspected = true;

        return "";
      },
    });

    // Intentional: logging the probe is the detection mechanism. Nothing is visible with DevTools closed.
    console.debug(probe);

    if (counter.record(wasInspected)) {
      onDetected();
    }
  }, CONSOLE_PROBE_INTERVAL_MS);

  return () => window.clearInterval(intervalId);
}

/** Starts every signal and returns one cleanup function. `onDetected` may fire more than once. */
export function startDevtoolsGuard(onDetected: () => void): () => void {
  const cleanups = [
    installShortcutShield(),
    watchDockedPanel(onDetected),
    watchDebuggerPauses(onDetected),
    watchMainThreadPauses(onDetected),
    watchConsoleProbe(onDetected),
  ];

  return () => cleanups.forEach((cleanup) => cleanup());
}
