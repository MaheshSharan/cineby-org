// Client-side edge worker pool manager and circuit breaker
// Tracks exhausted workers (HTTP 429 quota reached) in browser memory & notifies Redis backend

const ONE_HOUR_MS = 60 * 60 * 1000;
const knownWorkerOrigins = new Set<string>();
const exhaustedWorkers = new Map<string, number>(); // origin -> timestamp until exhausted
const feedbackSentOrigins = new Set<string>();

export function registerWorkerOrigin(urlStr: string): void {
  try {
    const origin = new URL(urlStr).origin.toLowerCase();
    if (origin.includes("workers.dev")) {
      knownWorkerOrigins.add(origin);
    }
  } catch {
    // ignore invalid URL
  }
}

/** Pre-populates all worker origins discovered when the initial M3U8 text is parsed */
export function registerPlaylistOrigins(m3u8Text: string): void {
  const matches = m3u8Text.matchAll(/https:\/\/[a-z0-9.-]+\.workers\.dev/gi);
  for (const m of matches) {
    if (m[0]) {
      knownWorkerOrigins.add(m[0].toLowerCase());
    }
  }
}

export function markWorkerExhaustedClient(workerOrigin: string): void {
  const clean = workerOrigin.trim().toLowerCase();
  exhaustedWorkers.set(clean, Date.now() + ONE_HOUR_MS);

  // Debounced: fire feedback POST only once per worker exhaustion cycle
  if (feedbackSentOrigins.has(clean)) return;
  feedbackSentOrigins.add(clean);

  try {
    if (typeof fetch === "function") {
      void fetch("/api/stream/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerUrl: clean, status: 429 }),
      }).catch(() => {
        // fail silent
      });
    }
  } catch {
    // fail silent
  }
}

export function isWorkerExhaustedClient(workerOrigin: string): boolean {
  const clean = workerOrigin.trim().toLowerCase();
  const until = exhaustedWorkers.get(clean);
  if (!until) return false;
  if (Date.now() > until) {
    exhaustedWorkers.delete(clean);
    return false;
  }
  return true;
}

/**
 * Returns alternative healthy base URL for a failing chunk request.
 * Prioritizes other live Cloudflare workers; falls back to VPS /api/stream/proxy if all are dead.
 */
export function getFallbackProxyUrl(currentChunkUrl: string): string | null {
  try {
    const parsed = new URL(currentChunkUrl);
    const failingOrigin = parsed.origin.toLowerCase();
    markWorkerExhaustedClient(failingOrigin);

    // Find any other healthy worker in known pool
    for (const workerOrigin of knownWorkerOrigins) {
      if (workerOrigin !== failingOrigin && !isWorkerExhaustedClient(workerOrigin)) {
        return `${workerOrigin}${parsed.pathname}${parsed.search}`;
      }
    }

    // If all edge workers exhausted, fallback to VPS built-in stream proxy
    return `/api/stream/proxy${parsed.search}`;
  } catch {
    return null;
  }
}
