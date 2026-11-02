import type { NextApiRequest, NextApiResponse } from "next";
import { applyCorsHeaders } from "@/lib/cors";
import { fetchSportsData, isFamousMatch } from "@/lib/sports/sportsService";
import { withApiContext } from "@/lib/validation";

export default withApiContext("api/sports", async (req: NextApiRequest, res: NextApiResponse) => {
  if (applyCorsHeaders(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // 60s stale-while-revalidate caching as specified in requirements
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=120");

    const data = await fetchSportsData();
    const famousLive = data.liveNow.filter((m) => isFamousMatch(m));
    res.status(200).json({ ...data, famousLive });
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "Failed to fetch sports data",
    });
  }
});
