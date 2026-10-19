import type { NextApiRequest, NextApiResponse } from "next";
import { getSiteUrl } from "@/lib/env/public";
import { generateUrlsetXml, type SitemapUrlEntry } from "@/lib/seo/sitemap";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end();
  }

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200"
  );

  const now = new Date().toISOString().split("T")[0];

  const staticUrls: SitemapUrlEntry[] = [
    { loc: `${getSiteUrl()}/`, lastmod: now, changefreq: "daily", priority: 1.0 },
    { loc: `${getSiteUrl()}/browse/movie`, lastmod: now, changefreq: "daily", priority: 0.9 },
    { loc: `${getSiteUrl()}/browse/tv`, lastmod: now, changefreq: "daily", priority: 0.9 },
    { loc: `${getSiteUrl()}/privacy`, lastmod: now, changefreq: "monthly", priority: 0.3 },
    { loc: `${getSiteUrl()}/terms`, lastmod: now, changefreq: "monthly", priority: 0.3 },
  ];

  const xml = generateUrlsetXml(staticUrls);
  return res.status(200).send(xml);
}
