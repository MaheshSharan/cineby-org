import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

import { buildMediaDescription, buildMediaTitle, truncateDescription } from "@/lib/seo/media";
import { buildAbsoluteUrl, SITE_URL } from "@/lib/seo/site";

const PUBLIC_DIR = path.join(process.cwd(), "public");

const NON_SITEMAP_PATH_PREFIXES = [
  "/api",
  "/history",
  "/login",
  "/movie/",
  "/profiles",
  "/register",
  "/settings",
  "/tv/",
  "/version",
  "/watch",
  "/watchlist",
];

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

function getSitemapPaths(): string[] {
  const xml = readPublicFile("sitemap.xml");

  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
}

describe("robots.txt", () => {
  const robotsText = readPublicFile("robots.txt");
  const groups = parseRobotsGroups(robotsText);

  it("points crawlers to the sitemap on the canonical origin", () => {
    expect(robotsText).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });

  it("keeps the player and private APIs away from every crawler group that allows the site", () => {
    for (const agent of ["*", "OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"]) {
      const group = findGroup(groups, agent);

      expect(group?.rules).toContain("Allow: /");
      expect(group?.rules).toContain("Disallow: /watch/");
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
    for (const agent of ["GPTBot", "ClaudeBot", "Google-Extended", "CCBot"]) {
      expect(findGroup(groups, agent)?.rules).toEqual(["Disallow: /"]);
    }
  });

  it("declares content signals that allow search and refuse training", () => {
    const wildcard = findGroup(groups, "*");

    expect(wildcard?.rules).toContain("Content-Signal: search=yes, ai-input=yes, ai-train=no");
  });
});

describe("sitemap.xml", () => {
  const sitemapPaths = getSitemapPaths();

  it("lists the home page and the browse pages", () => {
    expect(sitemapPaths).toEqual([
      "/",
      "/browse/movie",
      "/browse/tv",
      "/privacy",
      "/terms",
    ]);
  });

  it("uses the canonical origin for every URL", () => {
    const xml = readPublicFile("sitemap.xml");
    const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

    for (const location of locations) {
      expect(location.startsWith(`${SITE_URL}/`)).toBe(true);
    }
  });

  it("excludes title pages, the player, account pages and APIs", () => {
    for (const sitemapPath of sitemapPaths) {
      for (const prefix of NON_SITEMAP_PATH_PREFIXES) {
        expect(sitemapPath.startsWith(prefix)).toBe(false);
      }
    }
  });
});

describe("media SEO metadata", () => {
  it("builds absolute canonical URLs", () => {
    expect(buildAbsoluteUrl("/")).toBe(`${SITE_URL}/`);
    expect(buildAbsoluteUrl("/movie/1-iron-man")).toBe(`${SITE_URL}/movie/1-iron-man`);
    expect(buildAbsoluteUrl("browse/tv")).toBe(`${SITE_URL}/browse/tv`);
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
    ).toBe("Watch Quiet Film (2021) online on Cineby.");
    expect(
      buildMediaDescription({ title: "Quiet Film", overview: "   ", releaseDate: null })
    ).toBe("Watch Quiet Film online on Cineby.");
  });

  it("puts the release year in the title when known", () => {
    expect(buildMediaTitle({ title: "Iron Man", releaseDate: "2008-04-30" })).toBe(
      "Iron Man (2008) | Cineby"
    );
    expect(buildMediaTitle({ title: "Iron Man", releaseDate: null })).toBe("Iron Man | Cineby");
  });
});
