import type { NextApiRequest, NextApiResponse } from "next";
import { fetchTrailerUrlServer } from "@/lib/services/trailer.server";
import { withApiContext } from "@/lib/validation";
import { cacheControl } from "@/lib/cache/profiles";

const IMDB_ID_REGEX = /^tt\d+$/i;

export default withApiContext("api/trailer/[id]", async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!rawId || !IMDB_ID_REGEX.test(rawId.trim())) {
    res.status(400).json({ error: "Invalid IMDb ID" });
    return;
  }

  const url = await fetchTrailerUrlServer(rawId.trim());

  res.setHeader("Cache-Control", cacheControl(url ? "trailer" : "trailerMiss"));

  res.status(200).json({ url });
});
