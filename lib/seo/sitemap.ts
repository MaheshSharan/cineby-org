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
 * Strict regex for W3C sitemap date: YYYY-MM-DD.
 */
const ISO_DATE_REGEX = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

/**
 * Normalizes ISO date string to YYYY-MM-DD for sitemap <lastmod>.
 * Strictly ensures only valid W3C standard YYYY-MM-DD strings are emitted,
 * preventing Google Search Console "Invalid date" sitemap errors.
 */
export function formatLastmod(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== "string" || !dateStr.trim()) {
    return new Date().toISOString().split("T")[0];
  }

  const trimmed = dateStr.trim();

  // If already exactly YYYY-MM-DD and matches calendar constraints
  if (ISO_DATE_REGEX.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getUTCFullYear();
      if (year >= 1900 && year <= 2100) {
        return trimmed;
      }
    }
  }

  try {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getUTCFullYear();
      if (year >= 1900 && year <= 2100) {
        return parsed.toISOString().split("T")[0];
      }
    }
  } catch {
    // Ignore parsing errors and fall back to today's date
  }

  return new Date().toISOString().split("T")[0];
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
