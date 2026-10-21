export interface ActiveProvider {
  id: string;
  name: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

let cached: { fetchedAt: number; request: Promise<ActiveProvider[]> } | null = null;

async function requestActiveProviders(): Promise<ActiveProvider[]> {
  const response = await fetch("/api/stream/providers");
  if (!response.ok) {
    throw new Error(`Providers request failed with HTTP ${response.status}`);
  }

  const data: unknown = await response.json();
  const providers = (data as { providers?: unknown }).providers;

  return Array.isArray(providers) ? (providers as ActiveProvider[]) : [];
}

/**
 * The enabled providers rarely change, and the player needs them twice per playback (to build the
 * server list and to choose a fetcher), so share one request across callers for a few minutes.
 * Failures are not cached.
 */
export function fetchActiveProviders(): Promise<ActiveProvider[]> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.request;
  }

  const request = requestActiveProviders();
  const entry = { fetchedAt: Date.now(), request };
  cached = entry;

  request.catch(() => {
    if (cached === entry) cached = null;
  });

  return request;
}
