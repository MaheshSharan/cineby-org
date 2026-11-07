import type { NextApiRequest, NextApiResponse } from "next";
import { buildMediaCanonicalUrl, generateUrlsetXml, type SitemapUrlEntry } from "@/lib/seo/sitemap";
import { getSitemapMediaCatalog } from "@/lib/seo/sitemapCatalog";
import { logger } from "@/lib/logger";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end();
  }

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200"
  );

  try {
    const movies = await getSitemapMediaCatalog("movie");

    const urls: SitemapUrlEntry[] = movies.map((movie) => ({
      loc: buildMediaCanonicalUrl("movie", movie.id, movie.title),
      changefreq: "weekly",
      priority: 0.8,
    }));

    const xml = generateUrlsetXml(urls);
    return res.status(200).send(xml);
  } catch (error) {
    logger.error("[sitemaps/movies] Failed to generate movies sitemap:", error);
    return res.status(500).send("<!-- Failed to generate movie sitemap -->");
  }
}
