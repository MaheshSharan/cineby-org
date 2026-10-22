// Browser side effects for the DevTools guard. Decisions live in devtoolsSignals.ts.
//
// This is a deterrent, not a security boundary: anything client-side can be bypassed by a determined user.
// Stream protection must stay server-side (signed descriptors, rate limits).

import {
  createConfirmationCounter,
  DOCKED_PANEL_CONFIRMATIONS,
  hasWindowOrZoomChanged,
  isDesktopClass,
  isInspectShortcut,
  isPanelDockedSince,
  WORKER_PAUSE_CONFIRMATIONS,
  WORKER_PAUSE_THRESHOLD_MS,
  type ViewportMetrics,
} from "./devtoolsSignals";

const VIEWPORT_POLL_INTERVAL_MS = 500;

// Served from public/ because production minifiers strip `debugger` statements from bundled code.
const HEARTBEAT_WORKER_URL = "/devtools-heartbeat.js";

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
  const counter = createConfirmationCounter(WORKER_PAUSE_CONFIRMATIONS);
  let worker: Worker;

  try {
    worker = new Worker(HEARTBEAT_WORKER_URL);
  } catch {
    // Workers can be unavailable (restricted browsing contexts). The other signals still apply.
    return () => undefined;
  }

  worker.onmessage = (event: MessageEvent<unknown>) => {
    if (isPauseDuration(event.data) && counter.record(event.data > WORKER_PAUSE_THRESHOLD_MS)) {
      onDetected();
    }
  };

  return () => worker.terminate();
}

/** Starts every signal and returns one cleanup function. `onDetected` may fire more than once. */
export function startDevtoolsGuard(onDetected: () => void): () => void {
  const cleanups = [
    installShortcutShield(),
    watchDockedPanel(onDetected),
    watchDebuggerPauses(onDetected),
  ];

  return () => cleanups.forEach((cleanup) => cleanup());
}
