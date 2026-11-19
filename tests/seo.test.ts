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

  it("points crawlers to the sitemap on the canonical origin", () => {
    expect(robotsText).toContain(`Sitemap: ${getSiteUrl()}/sitemap.xml`);
  });

  it("keeps the player and private APIs away from every crawler group that allows the site", () => {
    for (const agent of ["*", "OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"]) {
      const group = findGroup(groups, agent);

      expect(group?.rules).toContain("Allow: /");
      expect(group?.rules).toContain("Disallow: /*?play=");
      expect(group?.rules).toContain("Disallow: /api/auth/");
      expect(group?.rules).toContain("Disallow: /api/stream/");
    }
  });

  it("does not block the pages and APIs public pages need to render", () => {
    const wildcard = findGroup(groups, "*");

    expect(wildcard?.rules).not.toContain("Disallow: /");
    expect(wildcard?.rules).not.toContain("Disallow: /api/");
    expect(wildcard?.rules).not.toContain("Disallow: /_next/");
  });

  it("blocks AI training crawlers entirely", () => {
    for (const agent of ["GPTBot", "ClaudeBot", "CCBot"]) {
      const groupRules = findGroup(groups, agent)?.rules;
      expect(groupRules).toContain("Disallow: /");
    }
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
    ).toBe("Watch Quiet Film (2021) full movie online in HD with English subtitles free on Cineby.");
    expect(
      buildMediaDescription({ title: "Quiet Film", overview: "   ", releaseDate: null })
    ).toBe("Watch Quiet Film full movie online in HD with English subtitles free on Cineby.");
  });

  it("puts the release year in the title when known", () => {
    expect(buildMediaTitle({ title: "Iron Man", releaseDate: "2008-04-30" })).toBe(
      "Watch Iron Man (2008) Online Free HD | Cineby"
    );
    expect(buildMediaTitle({ title: "Iron Man", releaseDate: null })).toBe(
      "Watch Iron Man Online Free HD | Cineby"
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
