import type { NextApiRequest, NextApiResponse } from "next";
import { getSiteUrl } from "@/lib/env/public";
import { generateUrlsetXml, type SitemapUrlEntry } from "@/lib/seo/sitemap";
import { getAllPosts } from "@/lib/blog/posts";

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
    { loc: `${baseUrl}/blog`, lastmod: now, changefreq: "weekly", priority: 0.8 },
    ...blogPosts,
    { loc: `${baseUrl}/privacy`, lastmod: now, changefreq: "monthly", priority: 0.3 },
    { loc: `${baseUrl}/terms`, lastmod: now, changefreq: "monthly", priority: 0.3 },
  ];

  const xml = generateUrlsetXml(staticUrls);
  return res.status(200).send(xml);
}
