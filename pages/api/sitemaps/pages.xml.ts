import type { NextApiRequest, NextApiResponse } from "next";
import { SITE_URL } from "@/lib/seo/site";
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
    { loc: `${SITE_URL}/`, lastmod: now, changefreq: "daily", priority: 1.0 },
    { loc: `${SITE_URL}/browse/movie`, lastmod: now, changefreq: "daily", priority: 0.9 },
    { loc: `${SITE_URL}/browse/tv`, lastmod: now, changefreq: "daily", priority: 0.9 },
    { loc: `${SITE_URL}/privacy`, lastmod: now, changefreq: "monthly", priority: 0.3 },
    { loc: `${SITE_URL}/terms`, lastmod: now, changefreq: "monthly", priority: 0.3 },
  ];

  const xml = generateUrlsetXml(staticUrls);
  return res.status(200).send(xml);
}
