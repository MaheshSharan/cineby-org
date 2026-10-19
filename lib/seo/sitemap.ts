import type { MediaType } from "@/lib/tmdb";
import { getMediaHref } from "@/lib/utils/media";
import { getSiteUrl } from "@/lib/env/public";

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

/**
 * Escapes characters that violate XML syntax (RFC / W3C XML standard).
 * Prevents sitemap parsing crashes on titles with '&', '<', '>', '"', or "'".
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Normalizes ISO date string to YYYY-MM-DD for sitemap <lastmod>.
 */
export function formatLastmod(dateStr?: string | null): string {
  if (!dateStr) {
    return new Date().toISOString().split("T")[0];
  }
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    return new Date().toISOString().split("T")[0];
  }
  return parsed.toISOString().split("T")[0];
}

/**
 * Builds a deterministic canonical URL for media matching the canonical tag.
 */
export function buildMediaCanonicalUrl(
  mediaType: MediaType,
  id: number,
  title?: string | null
): string {
  const relativeHref = getMediaHref(mediaType, id, title);
  return `${getSiteUrl()}${relativeHref}`;
}

/**
 * Generates valid XML for a sitemap index file pointing to sub-sitemaps.
 */
export function generateSitemapIndexXml(sitemaps: Array<{ loc: string; lastmod?: string }>): string {
  const entries = sitemaps
    .map(
      (s) =>
        `  <sitemap>\n    <loc>${escapeXml(s.loc)}</loc>\n    <lastmod>${formatLastmod(
          s.lastmod
        )}</lastmod>\n  </sitemap>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`;
}

/**
 * Generates valid XML for a standard urlset sitemap file.
 */
export function generateUrlsetXml(urls: SitemapUrlEntry[]): string {
  const entries = urls
    .map((u) => {
      let xml = `  <url>\n    <loc>${escapeXml(u.loc)}</loc>`;
      if (u.lastmod) {
        xml += `\n    <lastmod>${formatLastmod(u.lastmod)}</lastmod>`;
      }
      if (u.changefreq) {
        xml += `\n    <changefreq>${u.changefreq}</changefreq>`;
      }
      if (typeof u.priority === "number") {
        xml += `\n    <priority>${u.priority.toFixed(1)}</priority>`;
      }
      xml += `\n  </url>`;
      return xml;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}
