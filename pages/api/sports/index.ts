import type { NextApiRequest, NextApiResponse } from "next";
import { appCacheKeys, cachedFetch, getCacheStore } from "@/lib/cache";
import { cacheControl, NO_STORE_CACHE_CONTROL } from "@/lib/cache/profiles";
import { applyCorsHeaders } from "@/lib/cors";
import { logger } from "@/lib/logger";
import { fetchSportsData, isFamousMatch } from "@/lib/sports/sportsService";
import { withApiContext } from "@/lib/validation";

// A hard refresh drops the cached list, so it is limited to one per minute per isolate.
const REFRESH_COOLDOWN_MS = 60_000;
let lastRefreshAt = 0;

async function loadSportsPayload() {
  const data = await fetchSportsData();
  return { ...data, famousLive: data.liveNow.filter((match) => isFamousMatch(match)) };
}

export default withApiContext("api/sports", async (req: NextApiRequest, res: NextApiResponse) => {
  if (applyCorsHeaders(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const isRefreshRequested = req.query.refresh === "true";
  const now = Date.now();

  if (isRefreshRequested && now - lastRefreshAt >= REFRESH_COOLDOWN_MS) {
    lastRefreshAt = now;
    await getCacheStore().delete(appCacheKeys.sportsData);
  }

  try {
    const payload = await cachedFetch({
      key: appCacheKeys.sportsData,
      profile: "sportsData",
      fetcher: loadSportsPayload,
    });

    // A refresh answers one person who asked for fresh data, so no shared cache may keep that response.
    res.setHeader("Cache-Control", isRefreshRequested ? NO_STORE_CACHE_CONTROL : cacheControl("sportsData"));
    res.status(200).json(payload);
  } catch (error) {
    logger.error("[sports] Failed to load live listings", error);
    res.setHeader("Cache-Control", NO_STORE_CACHE_CONTROL);
    res.status(502).json({
      error: "Live listings are unavailable right now.",
    });
  }
});
