import { useState, useEffect } from "react";
import type { FlattenedSportsData } from "@/lib/sports/types";
import { processStreamsPayload } from "@/lib/sports/sportsService";

const CLIENT_PPV_ENDPOINTS = [
  "https://api.ppv.st/api/streams",
  "https://api.ppv.rw/api/streams",
  "https://api.ppv.ms/api/streams",
  "https://api.ppv.bi/api/streams",
  "https://api.ppv.ug/api/streams",
];

export async function fetchSportsClientSide(): Promise<FlattenedSportsData | null> {
  // First try internal /api/sports
  try {
    const localRes = await fetch("/api/sports");
    if (localRes.ok) {
      const localData = await localRes.json();
      if (Array.isArray(localData?.all) && localData.all.length > 0) {
        return localData as FlattenedSportsData;
      }
    }
  } catch {
    // Continue to direct browser fetch
  }

  // Fallback to direct client-side fetch from PPV endpoints
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

export function useSportsData(initialData: FlattenedSportsData | null) {
  const [data, setData] = useState<FlattenedSportsData | null>(initialData);
  const [isLoading, setIsLoading] = useState(!initialData || initialData.all.length === 0);

  useEffect(() => {
    if (initialData && initialData.all.length > 0) {
      setData(initialData);
      setIsLoading(false);
      return;
    }

    let isCurrent = true;
    setIsLoading(true);

    fetchSportsClientSide()
      .then((res) => {
        if (isCurrent && res) {
          setData(res);
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [initialData]);

  return { data, isLoading };
}
