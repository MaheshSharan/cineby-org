// Heartbeat worker for the DevTools guard (lib/security/devtoolsGuard.ts).
//
// Reports how long each `debugger` statement held this worker. It lives in public/ instead of the bundle
// because production minifiers strip `debugger` statements. The worker has its own thread, so main-thread
// hydration or CPU hitches can never look like a pause; a pause only happens while a debugger is attached
// and breakpoints are active.

const HEARTBEAT_INTERVAL_MS = 1000;

function measureDebuggerPauseMs() {
  const startedAt = performance.now();

  // Intentional: this statement is the detection mechanism and does nothing without an attached debugger.
  debugger;

  return performance.now() - startedAt;
}

setInterval(() => {
  self.postMessage(measureDebuggerPauseMs());
}, HEARTBEAT_INTERVAL_MS);
