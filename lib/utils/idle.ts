/**
 * Runs `task` once the browser is idle, or after `timeoutMs` at the latest.
 * Returns a function that cancels the task if it has not started yet.
 *
 * Safari has no requestIdleCallback, so there the task simply runs after `timeoutMs`.
 */
export function runWhenIdle(task: () => void, timeoutMs = 2000): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(task, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(handle);
  }

  const handle = window.setTimeout(task, timeoutMs);
  return () => window.clearTimeout(handle);
}
