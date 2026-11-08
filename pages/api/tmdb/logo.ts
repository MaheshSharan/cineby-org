import type { NextApiRequest, NextApiResponse } from "next";
import { cacheControl } from "@/lib/cache/profiles";
import { getMediaLogo } from "@/lib/tmdb/server";
import { withApiContext } from "@/lib/validation";
import type { MediaType } from "@/lib/tmdb/types";

export default withApiContext("api/tmdb/logo", async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { mediaType, id } = req.query;

  if (mediaType !== "movie" && mediaType !== "tv") {
    res.status(400).json({ error: "Invalid media type" });
    return;
  }

  if (typeof id !== "string" || !/^\d+$/.test(id)) {
    res.status(400).json({ error: "Invalid media id" });
    return;
  }

  const logoPath = await getMediaLogo(mediaType as MediaType, id);
  res.setHeader("Cache-Control", cacheControl("logo"));
  res.status(200).json({ logoPath });
});
