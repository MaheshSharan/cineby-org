import { logger } from "@/lib/logger";
import type { WingServer, WingServersResponse } from "./types";

const SERVERS_URL = "https://api.wing.st/servers";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cachedServers: WingServer[] = [];
let cacheExpiresAt = 0;

/**
 * Dynamically queries active child servers from api.wing.st/servers.
 * Cached in-memory with a 10-minute TTL to minimize outbound latency and network traffic.
 */
export async function getActiveCinejoyServers(signal?: AbortSignal): Promise<WingServer[]> {
  const now = Date.now();
  if (cachedServers.length > 0 && now < cacheExpiresAt) {
    return cachedServers;
  }

  try {
    const res = await fetch(SERVERS_URL, {
      signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      logger.warn(`[cinejoy:servers] Failed to fetch server list, status=${res.status}`);
      return cachedServers.length > 0 ? cachedServers : getDefaultServers();
    }

    const data = (await res.json()) as WingServersResponse;
    if (Array.isArray(data.servers) && data.servers.length > 0) {
      cachedServers = data.servers.filter((s) => s.status === "ok");
      cacheExpiresAt = now + CACHE_TTL_MS;
      return cachedServers;
    }
  } catch (error) {
    logger.warn(`[cinejoy:servers] Error querying server list: ${error instanceof Error ? error.message : String(error)}`);
  }

  return cachedServers.length > 0 ? cachedServers : getDefaultServers();
}

/** Fallback servers if initial network retrieval fails */
function getDefaultServers(): WingServer[] {
  return [
    { name: "Nebula", status: "ok", language: "https://flagsapi.com/US/flat/64.png", description: "", "4k": false },
    { name: "secret", status: "ok", language: "https://flagsapi.com/US/flat/64.png", description: "", "4k": true },
  ];
}
