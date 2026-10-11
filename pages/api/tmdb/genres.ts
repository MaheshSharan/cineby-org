import type { NextApiRequest, NextApiResponse } from "next";
import { getGenres } from "@/lib/tmdb/server";
import { withApiContext } from "@/lib/validation";
import type { MediaType } from "@/lib/tmdb";

export default withApiContext("api/tmdb/genres", async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const mediaType = parseMediaType(req.query.mediaType);
  const result = await getGenres(mediaType);
  res.status(200).json(result);
});

function parseMediaType(value: unknown): MediaType {
  if (value === "tv") {
    return "tv";
  }

  return "movie";
}