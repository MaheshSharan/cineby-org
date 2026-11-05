import type { NextApiRequest, NextApiResponse } from "next";
import { getMovieDetails } from "@/lib/tmdb/server";
import { withApiContext } from "@/lib/validation";

const ONE_DAY_SECONDS = 86400;
const TEN_MINUTES_SECONDS = 10 * 60;
const TWELVE_HOURS_SECONDS = 43200;

export default withApiContext("api/tmdb/movie/[id]", async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { id } = req.query;

  if (typeof id !== "string" || !/^\d+$/.test(id)) {
    res.status(400).json({ error: "Invalid movie id" });
    return;
  }

  const result = await getMovieDetails(id);
  res.setHeader(
    "Cache-Control",
    `public, max-age=${TEN_MINUTES_SECONDS}, s-maxage=${ONE_DAY_SECONDS}, stale-while-revalidate=${TWELVE_HOURS_SECONDS}`
  );
  res.status(200).json(result);
});
