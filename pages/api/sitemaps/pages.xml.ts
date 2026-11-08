import type { NextApiRequest, NextApiResponse } from "next";
import { getSiteUrl } from "@/lib/env/public";
import { generateUrlsetXml, type SitemapUrlEntry } from "@/lib/seo/sitemap";
import { getAllPosts } from "@/lib/blog/posts";
import { cacheControl } from "@/lib/cache/profiles";

// Pages whose content only changes when the file is edited. Update the date with the edit.
// Home, browse, sports and blog lists refresh daily, so they use today's date.
const STATIC_PAGE_LASTMOD = {
  app: "2026-11-07",
  about: "2026-11-07",
  privacy: "2026-10-17",
  terms: "2026-10-08",
} as const;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end();
  }

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", cacheControl("sitemap"));

  const now = new Date().toISOString().split("T")[0];
  const baseUrl = getSiteUrl();

  const blogPosts = getAllPosts().map((post) => ({
    loc: `${baseUrl}/blog/${post.slug}`,
    lastmod: post.updatedAt ?? post.publishedAt,
    changefreq: "weekly" as const,
    priority: 0.8,
  }));

  const staticUrls: SitemapUrlEntry[] = [
    { loc: `${baseUrl}/`, lastmod: now, changefreq: "daily", priority: 1.0 },
    { loc: `${baseUrl}/browse/movie`, lastmod: now, changefreq: "daily", priority: 0.9 },
    { loc: `${baseUrl}/browse/tv`, lastmod: now, changefreq: "daily", priority: 0.9 },
    { loc: `${baseUrl}/sports`, lastmod: now, changefreq: "daily", priority: 0.9 },
    { loc: `${baseUrl}/app`, lastmod: STATIC_PAGE_LASTMOD.app, changefreq: "weekly", priority: 0.9 },
    { loc: `${baseUrl}/blog`, lastmod: now, changefreq: "weekly", priority: 0.8 },
    { loc: `${baseUrl}/about`, lastmod: STATIC_PAGE_LASTMOD.about, changefreq: "monthly", priority: 0.6 },
    ...blogPosts,
    { loc: `${baseUrl}/privacy`, lastmod: STATIC_PAGE_LASTMOD.privacy, changefreq: "monthly", priority: 0.3 },
    { loc: `${baseUrl}/terms`, lastmod: STATIC_PAGE_LASTMOD.terms, changefreq: "monthly", priority: 0.3 },
  ];

  const xml = generateUrlsetXml(staticUrls);
  return res.status(200).send(xml);
}
