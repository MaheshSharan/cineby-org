import { computeLoadProgress, isInViewport } from "@/lib/loading/viewportProgress";

// Rows rendered after a data fetch add images late, so the view must stay quiet this long before it counts as loaded.
const SETTLE_MS = 400;
// A broken request must never leave the bar on screen.
const TIMEOUT_MS = 10_000;

interface TrackOptions {
  baseProgress: number;
  onProgress: (progress: number) => void;
  onDone: () => void;
}

/**
 * Reports real loading progress: the share of images inside the current viewport that have finished
 * loading. Images below the fold and hidden ones are not counted. Returns a function that stops tracking.
 */
export function trackViewportImages({ baseProgress, onProgress, onDone }: TrackOptions): () => void {
  const tracked = new Set<HTMLImageElement>();
  const observer = new MutationObserver(scheduleScan);
  const timeoutTimer = setTimeout(finish, TIMEOUT_MS);
  let isStopped = false;
  let frame = 0;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;

  function stop() {
    isStopped = true;
    cancelAnimationFrame(frame);
    clearTimeout(settleTimer);
    clearTimeout(timeoutTimer);
    observer.disconnect();
  }

  function finish() {
    if (isStopped) return;

    stop();
    onDone();
  }

  function scheduleScan() {
    if (!isStopped && frame === 0) frame = requestAnimationFrame(scan);
  }

  function scan() {
    frame = 0;
    if (isStopped) return;

    for (const image of document.images) {
      if (tracked.has(image) || !isInViewport(image.getBoundingClientRect(), window.innerWidth, window.innerHeight)) {
        continue;
      }

      tracked.add(image);
      image.addEventListener("load", scheduleScan, { once: true });
      image.addEventListener("error", scheduleScan, { once: true });
    }

    // complete is also true for images that failed, so a broken image never blocks the bar.
    const settled = [...tracked].filter((image) => image.complete).length;
    onProgress(computeLoadProgress(settled, tracked.size, baseProgress));

    clearTimeout(settleTimer);
    if (settled === tracked.size) settleTimer = setTimeout(finish, SETTLE_MS);
  }

  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
  scheduleScan();

  return stop;
}
