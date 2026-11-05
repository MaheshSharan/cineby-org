import type { NextApiRequest, NextApiResponse } from "next";
import { buildTmdbCacheControl } from "@/lib/cache/policy";
import { getSeasonEpisodes } from "@/lib/tmdb/server";
import { withApiContext } from "@/lib/validation";


export default withApiContext("api/tmdb/tv/[id]/season/[season]", async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const id = parseId(req.query.id);
  const seasonNumber = parseId(req.query.season);

  if (!id || !seasonNumber) {
    res.status(400).json({ error: "Invalid tv id or season" });
    return;
  }

  const result = await getSeasonEpisodes(id, seasonNumber);
  res.setHeader("Cache-Control", buildTmdbCacheControl("seasonEpisodes"));
  res.status(200).json(result);
});

function parseId(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : NaN;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
