import type { NextApiRequest, NextApiResponse } from "next";
import { getTrending } from "@/lib/tmdb/server";
import { withApiContext } from "@/lib/validation";
import { applyCorsHeaders } from "@/lib/cors";
import type { TrendingMediaType } from "@/lib/tmdb/server/trending";
import type { TrendingTimeWindow } from "@/lib/tmdb";

export default withApiContext("api/tmdb/trending", async (req: NextApiRequest, res: NextApiResponse) => {
  if (applyCorsHeaders(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const mediaType = parseMediaType(req.query.mediaType);
  const timeWindow = parseTimeWindow(req.query.timeWindow);
  const page = parsePage(req.query.page);

  const result = await getTrending(mediaType, timeWindow, page);
  res.setHeader(
    "Cache-Control",
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400"
  );
  res.status(200).json(result);
});

function parseMediaType(value: unknown): TrendingMediaType {
  if (value === "movie" || value === "tv" || value === "all") {
    return value;
  }

  return "all";
}

function parseTimeWindow(value: unknown): TrendingTimeWindow {
  if (value === "week") {
    return "week";
  }

  return "day";
}

function parsePage(value: unknown): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : NaN;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}