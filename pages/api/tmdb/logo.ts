import type { NextApiRequest, NextApiResponse } from "next";
import { getMediaLogo } from "@/lib/tmdb/server";
import { logError } from "@/lib/logger";
import type { MediaType } from "@/lib/tmdb/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  try {
    const logoPath = await getMediaLogo(mediaType as MediaType, id);
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=43200");
    res.status(200).json({ logoPath });
  } catch (error) {
    logError("api/tmdb/logo", error);
    res.status(500).json({ error: "Failed to fetch media logo" });
  }
}
