import type { NextApiRequest, NextApiResponse } from "next";
import { applyCorsHeaders } from "@/lib/cors";
import { fetchSportsData, isFamousMatch } from "@/lib/sports/sportsService";
import { withApiContext } from "@/lib/validation";

// Server-side cache rate-limiter: at most 1 hard-refresh accepted globally every 60s
let lastServerFetchTime = 0;
let cachedServerData: { data: unknown; timestamp: number } | null = null;
const SERVER_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export default withApiContext("api/sports", async (req: NextApiRequest, res: NextApiResponse) => {
  if (applyCorsHeaders(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const isBypassRequested = req.query.refresh === "true";
  const now = Date.now();

  // If hard-refresh requested within 60s cooldown, serve cached data
  if (isBypassRequested && now - lastServerFetchTime < 60000 && cachedServerData) {
    res.setHeader("Cache-Control", "public, max-age=30, s-maxage=30, stale-while-revalidate=60");
    res.status(200).json(cachedServerData.data);
    return;
  }

  // If normal request and valid 2m server cache exists, serve it
  if (!isBypassRequested && cachedServerData && now - cachedServerData.timestamp < SERVER_CACHE_TTL_MS) {
    res.setHeader("Cache-Control", "public, max-age=120, s-maxage=120, stale-while-revalidate=300");
    res.status(200).json(cachedServerData.data);
    return;
  }

  try {
    // 2 minutes max-age with 5 minutes (300s) stale-while-revalidate
    res.setHeader("Cache-Control", "public, max-age=120, s-maxage=120, stale-while-revalidate=300");

    const data = await fetchSportsData();
    const famousLive = data.liveNow.filter((m) => isFamousMatch(m));
    const payload = { ...data, famousLive };

    cachedServerData = {
      data: payload,
      timestamp: now,
    };
    lastServerFetchTime = now;

    res.status(200).json(payload);
  } catch (error) {
    // If upstream fails but we have stale cache, return stale cache gracefully
    if (cachedServerData) {
      res.setHeader("Cache-Control", "public, max-age=30, s-maxage=30");
      res.status(200).json(cachedServerData.data);
      return;
    }

    res.status(502).json({
      error: error instanceof Error ? error.message : "Failed to fetch sports data",
    });
  }
});
