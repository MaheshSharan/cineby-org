import { useState, useEffect, useCallback, useRef } from "react";
import type { FlattenedSportsData } from "@/lib/sports/types";
import { processStreamsPayload } from "@/lib/sports/sportsService";

const CLIENT_PPV_ENDPOINTS = [
  "https://api.ppv.st/api/streams",
  "https://api.ppv.rw/api/streams",
  "https://api.ppv.ms/api/streams",
  "https://api.ppv.bi/api/streams",
  "https://api.ppv.ug/api/streams",
];

// 2 minutes client in-memory cache TTL (120,000 ms)
const CLIENT_CACHE_TTL_MS = 2 * 60 * 1000;

interface CachedSportsEntry {
  data: FlattenedSportsData;
  timestamp: number;
}

let inMemoryCache: CachedSportsEntry | null = null;
let activeFetchPromise: Promise<FlattenedSportsData | null> | null = null;

async function executeFetch(bypassCache = false): Promise<FlattenedSportsData | null> {
  const url = bypassCache ? "/api/sports?refresh=true" : "/api/sports";

  // 1. Try internal API endpoint with SWR cache headers
  try {
    const localRes = await fetch(url);
    if (localRes.ok) {
      const localData = await localRes.json();
      if (Array.isArray(localData?.all) && localData.all.length > 0) {
        return localData as FlattenedSportsData;
      }
    }
  } catch {
    // Continue to direct browser fetch
  }

  // 2. Direct browser fallback to CORS-enabled mirrors
  for (const endpoint of CLIENT_PPV_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        headers: { Accept: "application/json" },
      });
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
 * Reuses active in-flight request and 2-minute memory cache.
 */
export async function fetchSportsClientSide(bypassCache = false): Promise<FlattenedSportsData | null> {
  const now = Date.now();

  // Return cached result if valid and not bypassing
  if (!bypassCache && inMemoryCache && now - inMemoryCache.timestamp < CLIENT_CACHE_TTL_MS) {
    return inMemoryCache.data;
  }

  // Deduplicate concurrent requests
  if (!activeFetchPromise || bypassCache) {
    activeFetchPromise = executeFetch(bypassCache)
      .then((data) => {
        if (data && data.all.length > 0) {
          inMemoryCache = {
            data,
            timestamp: Date.now(),
          };
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
    return inMemoryCache?.data ?? null;
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
