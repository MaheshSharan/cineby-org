import type { NextApiRequest, NextApiResponse } from "next";
import { getSiteUrl } from "@/lib/env/public";
import { generateSitemapIndexXml } from "@/lib/seo/sitemap";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end();
  }

  // Edge and browser caching: 24h at edge (s-maxage), 12h stale-while-revalidate
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200"
  );

  const now = new Date().toISOString().split("T")[0];

  const sitemaps = [
    { loc: `${getSiteUrl()}/sitemaps/pages.xml`, lastmod: now },
    { loc: `${getSiteUrl()}/sitemaps/movies.xml`, lastmod: now },
    { loc: `${getSiteUrl()}/sitemaps/tv.xml`, lastmod: now },
  ];

  const xml = generateSitemapIndexXml(sitemaps);
  return res.status(200).send(xml);
}
