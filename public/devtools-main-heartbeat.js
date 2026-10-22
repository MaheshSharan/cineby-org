// Main-thread heartbeat for the DevTools guard (lib/security/devtoolsGuard.ts).
//
// Reports how long each `debugger` statement held the page. It lives in public/ because production minifiers
// strip `debugger` statements from bundled code. Event names must match devtoolsGuard.ts.

const HEARTBEAT_INTERVAL_MS = 500;
const PAUSE_EVENT_NAME = "cineby:debugger-pause";
const STOP_EVENT_NAME = "cineby:debugger-stop";

function measureDebuggerPauseMs() {
  const startedAt = performance.now();

  // Intentional: this statement is the detection mechanism and does nothing without an attached debugger.
  debugger;

  return performance.now() - startedAt;
}

const intervalId = setInterval(() => {
  window.dispatchEvent(new CustomEvent(PAUSE_EVENT_NAME, { detail: measureDebuggerPauseMs() }));
}, HEARTBEAT_INTERVAL_MS);

window.addEventListener(STOP_EVENT_NAME, () => clearInterval(intervalId), { once: true });
