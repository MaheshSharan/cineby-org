import { describe, it, expect } from "vitest";
import { escapeXml, formatLastmod, generateSitemapIndexXml, generateUrlsetXml } from "@/lib/seo/sitemap";
import { SITE_URL } from "@/lib/seo/site";

describe("sitemap generator", () => {
  it("escapes invalid XML characters to prevent parser corruption", () => {
    const raw = "Fast & Furious <Hobbs & Shaw> \"Special\" 'Edition'";
    const escaped = escapeXml(raw);

    expect(escaped).toBe("Fast &amp; Furious &lt;Hobbs &amp; Shaw&gt; &quot;Special&quot; &apos;Edition&apos;");
    expect(escaped).not.toContain("& ");
    expect(escaped).not.toContain("<");
    expect(escaped).not.toContain(">");
  });

  it("formats dates to YYYY-MM-DD compliant lastmod strings", () => {
    expect(formatLastmod("2026-10-18T01:30:00.000Z")).toBe("2026-10-18");
    expect(formatLastmod("2024-05-12")).toBe("2024-05-12");
    expect(formatLastmod(null)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("generates a valid sitemap index XML", () => {
    const sitemaps = [
      { loc: `${SITE_URL}/sitemaps/pages.xml`, lastmod: "2026-10-18" },
      { loc: `${SITE_URL}/sitemaps/movies.xml`, lastmod: "2026-10-18" },
      { loc: `${SITE_URL}/sitemaps/tv.xml`, lastmod: "2026-10-18" },
    ];

    const xml = generateSitemapIndexXml(sitemaps);

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<loc>${SITE_URL}/sitemaps/movies.xml</loc>`);
    expect(xml).toContain("<lastmod>2026-10-18</lastmod>");
  });

  it("generates a valid urlset XML with canonical locations", () => {
    const urls = [
      { loc: `${SITE_URL}/movie/603-the-matrix`, lastmod: "1999-03-30", changefreq: "weekly" as const, priority: 0.8 },
      { loc: `${SITE_URL}/movie/157336-interstellar`, lastmod: "2014-11-05", changefreq: "weekly" as const, priority: 0.8 },
    ];

    const xml = generateUrlsetXml(urls);

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<loc>${SITE_URL}/movie/603-the-matrix</loc>`);
    expect(xml).toContain("<lastmod>1999-03-30</lastmod>");
    expect(xml).toContain("<changefreq>weekly</changefreq>");
    expect(xml).toContain("<priority>0.8</priority>");
  });
});
