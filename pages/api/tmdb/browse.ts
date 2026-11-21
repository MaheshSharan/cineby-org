import type { NextApiRequest, NextApiResponse } from "next";
import { cacheControl } from "@/lib/cache/profiles";
import { getBrowsePage } from "@/lib/tmdb/server";
import { withApiContext } from "@/lib/validation";
import { applyCorsHeaders } from "@/lib/cors";
import { parseBrowseKeywords } from "@/lib/christmas";
import type { MediaType } from "@/lib/tmdb";

export default withApiContext("api/tmdb/browse", async (req: NextApiRequest, res: NextApiResponse) => {
  if (applyCorsHeaders(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const mediaType = parseMediaType(req.query.mediaType);
  const genreId = parseOptionalNumber(req.query.genreId);
  const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : undefined;
  const page = parsePage(req.query.page);
  const withKeywords = parseBrowseKeywords(req.query.keywords);

  const result = await getBrowsePage({ mediaType, genreId, sortBy, page, withKeywords });

  res.setHeader("Cache-Control", cacheControl("discover"));
  res.status(200).json(result);
});

function parseMediaType(value: unknown): MediaType {
  if (value === "tv") {
    return "tv";
  }

  return "movie";
}

function parseOptionalNumber(value: unknown): number | undefined {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : NaN;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parsePage(value: unknown): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : NaN;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}