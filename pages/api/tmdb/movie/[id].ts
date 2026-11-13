import type { NextApiRequest, NextApiResponse } from "next";
import { cacheControl } from "@/lib/cache/profiles";
import { isTakenDown } from "@/lib/takedowns";
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

  if (isTakenDown("movie", id)) {
    res.status(410).json({ error: "This title is no longer available" });
    return;
  }

  const result = await getMovieDetails(id);
  res.setHeader("Cache-Control", cacheControl("movieDetails"));
  res.status(200).json(result);
});
