import { useState, useEffect, useCallback, useRef } from "react";
import type { FlattenedSportsData } from "@/lib/sports/types";
import { processStreamsPayload, getActiveEndpoints } from "@/lib/sports/sportsService";
import { browserTtlMs } from "@/lib/cache/profiles";

const CLIENT_CACHE_TTL_MS = browserTtlMs("sportsData");
const SESSION_CACHE_KEY = "cineby_sports_cache";

interface CachedSportsEntry {
  data: FlattenedSportsData;
  timestamp: number;
}

let inMemoryCache: CachedSportsEntry | null = null;
let activeFetchPromise: Promise<FlattenedSportsData | null> | null = null;

function readSessionStorageCache(): CachedSportsEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSportsEntry;
    if (parsed && parsed.data && typeof parsed.timestamp === "number") {
      if (Date.now() - parsed.timestamp < CLIENT_CACHE_TTL_MS) {
        return parsed;
      }
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

function writeSessionStorageCache(entry: CachedSportsEntry): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage write errors (e.g. quota exceeded)
  }
}

async function fetchFromMirrors(): Promise<FlattenedSportsData | null> {
  const endpoints = getActiveEndpoints();

  // Direct browser fetch to CORS-enabled mirrors (fast 3.5s abort timeout per mirror)
  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.streams) && json.streams.length > 0) {
          return processStreamsPayload(json);
        }
      }
    } catch {
      // Continue to next mirror
    }
  }

  return null;
}

/**
 * Single deduplicated fetch for all consumers (HeroCarousel, LiveSportsRow, SportsHub).
 * Reuses active in-flight request, in-memory cache, and sessionStorage.
 */
export async function fetchSportsClientSide(bypassCache = false): Promise<FlattenedSportsData | null> {
  const now = Date.now();

  // Return cached result if valid and not bypassing
  if (!bypassCache) {
    if (inMemoryCache && now - inMemoryCache.timestamp < CLIENT_CACHE_TTL_MS) {
      return inMemoryCache.data;
    }
    const sessionCached = readSessionStorageCache();
    if (sessionCached) {
      inMemoryCache = sessionCached;
      return sessionCached.data;
    }
  }

  // Deduplicate concurrent requests
  if (!activeFetchPromise || bypassCache) {
    activeFetchPromise = fetchFromMirrors()
      .then((data) => {
        if (data && data.all.length > 0) {
          const entry: CachedSportsEntry = {
            data,
            timestamp: Date.now(),
          };
          inMemoryCache = entry;
          writeSessionStorageCache(entry);
        }
        return data;
      })
      .finally(() => {
        activeFetchPromise = null;
      });
  }

  return activeFetchPromise;
}

export function useSportsData(initialData: FlattenedSportsData | null) {
  const [data, setData] = useState<FlattenedSportsData | null>(() => {
    if (initialData && initialData.all.length > 0) {
      if (!inMemoryCache) {
        inMemoryCache = { data: initialData, timestamp: Date.now() };
      }
      return initialData;
    }
    if (inMemoryCache?.data) {
      return inMemoryCache.data;
    }
    const sessionEntry = readSessionStorageCache();
    if (sessionEntry) {
      inMemoryCache = sessionEntry;
      return sessionEntry.data;
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(!data || data.all.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastRefreshTimeRef = useRef(0);

  const loadData = useCallback(async (bypass = false) => {
    if (bypass) {
      setIsRefreshing(true);
    } else if (!data) {
      setIsLoading(true);
    }

    try {
      const res = await fetchSportsClientSide(bypass);
      if (res) {
        setData(res);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    if (initialData && initialData.all.length > 0) {
      setData(initialData);
      setIsLoading(false);
      return;
    }

    if (!data) {
      loadData(false);
    }
  }, [initialData, data, loadData]);

  // Client-level debounced refresh (minimum 5s cooldown per client button click)
  const refresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 5000 || isRefreshing) {
      return;
    }
    lastRefreshTimeRef.current = now;
    await loadData(true);
  }, [isRefreshing, loadData]);

  return {
    data,
    isLoading,
    isRefreshing,
    refresh,
  };
}
