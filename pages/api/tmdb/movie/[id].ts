import type { NextApiRequest, NextApiResponse } from "next";
import { buildTmdbCacheControl } from "@/lib/cache/policy";
import { getMovieDetails } from "@/lib/tmdb/server";
import { withApiContext } from "@/lib/validation";


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
  res.setHeader("Cache-Control", buildTmdbCacheControl("movieDetails"));
  res.status(200).json(result);
});
