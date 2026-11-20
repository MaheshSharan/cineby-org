import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

import { buildMediaDescription, buildMediaTitle, truncateDescription } from "@/lib/seo/media";
import { buildAbsoluteUrl } from "@/lib/seo/site";
import { getSiteUrl } from "@/lib/env/public";
import { generateSitemapIndexXml } from "@/lib/seo/sitemap";

const PUBLIC_DIR = path.join(process.cwd(), "public");

interface RobotsGroup {
  agents: string[];
  rules: string[];
}

function readPublicFile(name: string): string {
  return fs.readFileSync(path.join(PUBLIC_DIR, name), "utf8");
}

function parseRobotsGroups(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#") || line.toLowerCase().startsWith("sitemap:")) {
      continue;
    }

    if (line.toLowerCase().startsWith("user-agent:")) {
      const agent = line.slice("user-agent:".length).trim();

      if (current && current.rules.length === 0) {
        current.agents.push(agent);
      } else {
        current = { agents: [agent], rules: [] };
        groups.push(current);
      }
      continue;
    }

    current?.rules.push(line);
  }

  return groups;
}

function findGroup(groups: RobotsGroup[], agent: string): RobotsGroup | undefined {
  return groups.find((group) => group.agents.includes(agent));
}

describe("robots.txt", () => {
  const robotsText = readPublicFile("robots.txt");
  const groups = parseRobotsGroups(robotsText);

  it("does not expose sitemap in robots.txt for scraper stealth", () => {
    expect(robotsText).not.toContain("Sitemap:");
  });

  it("blocks private APIs while keeping public rendering APIs open", () => {
    const wildcard = findGroup(groups, "*");
    expect(wildcard?.rules).toContain("Allow: /");
    expect(wildcard?.rules).toContain("Disallow: /api/");
    expect(wildcard?.rules).toContain("Allow: /api/tmdb/");
    expect(wildcard?.rules).toContain("Allow: /api/discover/");
  });

  it("does not block the pages and next assets public pages need to render", () => {
    const wildcard = findGroup(groups, "*");

    expect(wildcard?.rules).not.toContain("Disallow: /");
    expect(wildcard?.rules).not.toContain("Disallow: /_next/");
  });

  it("lets Google-Extended through so Gemini can use the content", () => {
    // No dedicated group, so Google-Extended follows the "*" group, which allows "/".
    expect(findGroup(groups, "Google-Extended")).toBeUndefined();
  });

  it("declares content signals that allow search and refuse training", () => {
    const wildcard = findGroup(groups, "*");

    expect(wildcard?.rules).toContain("Content-Signal: search=yes, ai-input=yes, ai-train=no");
  });
});

describe("sitemap.xml", () => {
  it("generates a sitemap index pointing to the pages sitemap on the canonical origin", () => {
    const sitemaps = [{ loc: `${getSiteUrl()}/sitemaps/pages.xml`, lastmod: "2026-10-18" }];
    const xml = generateSitemapIndexXml(sitemaps);
    const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

    expect(locations).toEqual([`${getSiteUrl()}/sitemaps/pages.xml`]);
  });
});

describe("media SEO metadata", () => {
  it("builds absolute canonical URLs", () => {
    expect(buildAbsoluteUrl("/")).toBe(`${getSiteUrl()}/`);
    expect(buildAbsoluteUrl("/movie/1-iron-man")).toBe(`${getSiteUrl()}/movie/1-iron-man`);
    expect(buildAbsoluteUrl("browse/tv")).toBe(`${getSiteUrl()}/browse/tv`);
  });

  it("keeps short overviews untouched and collapses whitespace", () => {
    expect(truncateDescription("  A  short\n overview. ")).toBe("A short overview.");
  });

  it("truncates long overviews on a word boundary within the limit", () => {
    const longOverview = "word ".repeat(80);
    const result = truncateDescription(longOverview);

    expect(result.length).toBeLessThanOrEqual(160);
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toMatch(/wor…$/);
  });

  it("falls back to a generated description when TMDB has no overview", () => {
    expect(
      buildMediaDescription({ title: "Quiet Film", overview: "", releaseDate: "2021-05-04" })
    ).toBe("Explore synopsis, cast, and release details for Quiet Film (2021) on Cineby.");
    expect(
      buildMediaDescription({ title: "Quiet Film", overview: "   ", releaseDate: null })
    ).toBe("Explore synopsis, cast, and release details for Quiet Film on Cineby.");
  });

  it("puts the release year in the title when known", () => {
    expect(buildMediaTitle({ title: "Iron Man", releaseDate: "2008-04-30" })).toBe(
      "Iron Man (2008) | Cineby"
    );
    expect(buildMediaTitle({ title: "Iron Man", releaseDate: null })).toBe(
      "Iron Man | Cineby"
    );
  });
});

describe("IndexNow protocol verification", () => {
  it("serves an IndexNow verification key file matching its filename", () => {
    const key = "7167d655bfd4a931ef195c13ff631d3f";
    const content = readPublicFile(`${key}.txt`).trim();

    expect(content).toBe(key);
  });
});


describe("category breadcrumb and relaunch content", () => {
  it("builds a two-level breadcrumb for browse pages", async () => {
    const { buildCategoryBreadcrumbJsonLd } = await import("@/lib/seo/jsonLd");
    const data = buildCategoryBreadcrumbJsonLd("movie") as unknown as {
      itemListElement: Array<{ position: number; name: string; item: string }>;
    };

    expect(data.itemListElement).toHaveLength(2);
    expect(data.itemListElement[0]).toMatchObject({ position: 1, name: "Home" });
    expect(data.itemListElement[1]).toMatchObject({ position: 2, name: "Movies" });
    expect(data.itemListElement[1].item).toMatch(/\/browse\/movie$/);
  });

  it("keeps the home FAQ at 10 items and publishes the relaunch post", async () => {
    const { HOME_FAQ_ITEMS } = await import("@/lib/seo/faqSchema");
    const { getPostBySlug } = await import("@/lib/blog/posts");

    expect(HOME_FAQ_ITEMS).toHaveLength(10);
    expect(getPostBySlug("cineby-is-back-2026-official-streaming-relaunch")).not.toBeNull();
  });
});

describe("Clarity page rules", () => {
  it("records everywhere except player, login and register pages", async () => {
    const { isClarityAllowedPath } = await import("@/lib/analytics/clarity");

    expect(isClarityAllowedPath("/")).toBe(true);
    expect(isClarityAllowedPath("/sports")).toBe(true);
    expect(isClarityAllowedPath("/movie/1?x=y")).toBe(true);
    expect(isClarityAllowedPath("/watch/movie/1")).toBe(false);
    expect(isClarityAllowedPath("/sports/football/match")).toBe(false);
    expect(isClarityAllowedPath("/movie/1?play=true")).toBe(false);
    expect(isClarityAllowedPath("/login")).toBe(false);
    expect(isClarityAllowedPath("/register?next=/")).toBe(false);
  });
});
