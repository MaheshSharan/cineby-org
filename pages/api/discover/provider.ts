import type { NextApiRequest, NextApiResponse } from "next";

import type { MediaSummary } from "@/lib/tmdb";
import { discoverMovies, discoverTv } from "@/lib/tmdb/server";
import { withApiContext } from "@/lib/validation";
import { applyCorsHeaders } from "@/lib/cors";

export default withApiContext("api/discover/provider", async (req: NextApiRequest, res: NextApiResponse) => {
  if (applyCorsHeaders(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    res.status(405).json({ error: `Method ${req.method ?? "UNKNOWN"} Not Allowed` });
    return;
  }

  const providerIdParam = req.query.providerId;
  const providerId = typeof providerIdParam === "string" ? Number.parseInt(providerIdParam, 10) : 8;
  const validProviderId = Number.isNaN(providerId) ? 8 : providerId;

  const [moviesPage1, moviesPage2, tvPage1, tvPage2] = await Promise.all([
    discoverMovies({ providerId: validProviderId, watchRegion: "US", sortBy: "popularity.desc", page: 1 }),
    discoverMovies({ providerId: validProviderId, watchRegion: "US", sortBy: "popularity.desc", page: 2 }),
    discoverTv({ providerId: validProviderId, watchRegion: "US", sortBy: "popularity.desc", page: 1 }),
    discoverTv({ providerId: validProviderId, watchRegion: "US", sortBy: "popularity.desc", page: 2 }),
  ]);

  const allMovies = [...moviesPage1.results, ...moviesPage2.results];
  const allTv = [...tvPage1.results, ...tvPage2.results];

  // Interleave movies and TV shows
  const results: MediaSummary[] = [];
  const maxLen = Math.max(allMovies.length, allTv.length);

  for (let i = 0; i < maxLen; i += 1) {
    if (i < allMovies.length) results.push(allMovies[i]);
    if (i < allTv.length) results.push(allTv[i]);
  }

  res.status(200).json({ results });
});
