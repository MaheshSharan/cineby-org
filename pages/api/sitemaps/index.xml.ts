import type { NextApiRequest, NextApiResponse } from "next";
import { getSiteUrl } from "@/lib/env/public";
import { generateSitemapIndexXml } from "@/lib/seo/sitemap";
import { cacheControl } from "@/lib/cache/profiles";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end();
  }

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", cacheControl("sitemap"));

  const now = new Date().toISOString().split("T")[0];

  const sitemaps = [
    { loc: `${getSiteUrl()}/sitemaps/pages.xml`, lastmod: now },
    { loc: `${getSiteUrl()}/sitemaps/movies.xml`, lastmod: now },
    { loc: `${getSiteUrl()}/sitemaps/tv.xml`, lastmod: now },
  ];

  const xml = generateSitemapIndexXml(sitemaps);
  return res.status(200).send(xml);
}
