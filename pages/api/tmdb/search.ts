import type { NextApiRequest, NextApiResponse } from "next";
import { searchMulti } from "@/lib/tmdb/server";
import { withApiContext } from "@/lib/validation";

export default withApiContext("api/tmdb/search", async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const page = parsePage(req.query.page);

  if (!query) {
    res.status(400).json({ error: "Query parameter 'q' is required" });
    return;
  }

  const result = await searchMulti(query, page);
  // Cache popular search results at the Cloudflare edge: 1 hour edge cache, 10 min browser
  res.setHeader(
    "Cache-Control",
    "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400"
  );
  res.status(200).json(result);
});

function parsePage(value: unknown): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : NaN;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}