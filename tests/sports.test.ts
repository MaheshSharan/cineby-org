import { describe, expect, it } from "vitest";
import {
  calculateMatchScore,
  isMatchLive,
  isMatchUpcoming,
  findMatchBySlugOrId,
  getCompetitionTierScore,
  getTeamPopularityScore,
  getHomepageDiversifiedMatches,
} from "@/lib/sports/sportsService";
import { type SportMatch, getSportWatchHref } from "@/lib/sports/types";

describe("sportsService logic & dynamic ranking", () => {
  const premierLeagueMatch: SportMatch = {
    id: 100,
    name: "Arsenal vs Chelsea",
    tag: "Premier League",
    category_name: "Football",
    uri_name: "football/premier-league/ars-che",
    starts_at: 1000,
    ends_at: 2000,
    always_live: 0,
    iframe: "https://taifood-blog.asia/embed/ars-che",
    viewers: "250",
  };

  const serieAMatch: SportMatch = {
    id: 101,
    name: "Lecce vs Empoli",
    tag: "Serie A",
    category_name: "Football",
    uri_name: "football/serie-a/lec-emp",
    starts_at: 1000,
    ends_at: 2000,
    always_live: 0,
    iframe: "https://taifood-blog.asia/embed/lec-emp",
    viewers: "250",
  };

  const ligue1Match: SportMatch = {
    id: 102,
    name: "Brest vs Le Havre",
    tag: "Ligue 1",
    category_name: "Football",
    uri_name: "football/ligue-1/bre-hav",
    starts_at: 1000,
    ends_at: 2000,
    always_live: 0,
    iframe: "https://taifood-blog.asia/embed/bre-hav",
    viewers: "250",
  };

  it("generates correct watch hrefs", () => {
    expect(getSportWatchHref("nfl-network")).toBe("/sports/nfl-network");
    expect(getSportWatchHref("football/premier-league/ars-che")).toBe("/sports/football/premier-league/ars-che");
    expect(getSportWatchHref("/sports/sample")).toBe("/sports/sports/sample");
  });

  it("identifies match live state correctly", () => {
    expect(isMatchLive(premierLeagueMatch, 1500)).toBe(true);
    expect(isMatchLive(premierLeagueMatch, 500)).toBe(false);
    expect(isMatchLive(premierLeagueMatch, 2500)).toBe(false);

    const alwaysLiveMatch: SportMatch = { ...premierLeagueMatch, always_live: 1 };
    expect(isMatchLive(alwaysLiveMatch, 500)).toBe(true);
  });

  it("identifies upcoming match state correctly", () => {
    expect(isMatchUpcoming(premierLeagueMatch, 500)).toBe(true);
    expect(isMatchUpcoming(premierLeagueMatch, 1500)).toBe(false);
    expect(isMatchUpcoming(premierLeagueMatch, 2500)).toBe(false);

    const alwaysLiveMatch: SportMatch = { ...premierLeagueMatch, always_live: 1 };
    expect(isMatchUpcoming(alwaysLiveMatch, 500)).toBe(false);
  });

  it("ranks Premier League higher than Serie A and Ligue 1 under identical conditions", () => {
    const plScore = calculateMatchScore(premierLeagueMatch, 1500);
    const serieAScore = calculateMatchScore(serieAMatch, 1500);
    const ligue1Score = calculateMatchScore(ligue1Match, 1500);

    expect(plScore).toBeGreaterThan(serieAScore);
    expect(serieAScore).toBeGreaterThan(ligue1Score);
  });

  it("accurately calculates competition tiers and team popularity", () => {
    expect(getCompetitionTierScore("Premier League")).toBe(3500);
    expect(getCompetitionTierScore("Serie A")).toBe(2200);
    expect(getCompetitionTierScore("Ligue 1")).toBe(1200);

    expect(getTeamPopularityScore("Arsenal")).toBe(2500);
    expect(getTeamPopularityScore("Real Madrid")).toBe(2500);
    expect(getTeamPopularityScore("Juventus")).toBe(1400);
    expect(getTeamPopularityScore("Lecce")).toBe(150);
  });

  it("enforces diversity in top homepage row", () => {
    const matches: SportMatch[] = Array.from({ length: 8 }, (_, i) => ({
      ...serieAMatch,
      id: 200 + i,
      uri_name: `match-${i}`,
      tag: "Serie A",
    }));

    const otherMatch: SportMatch = {
      ...premierLeagueMatch,
      id: 300,
      tag: "F1",
      category_name: "Motorsport",
      uri_name: "f1-monaco",
    };

    const combined = [...matches, otherMatch];
    const diversified = getHomepageDiversifiedMatches(combined, 10);

    // In top 10, max 4 matches from Serie A before other sports are included
    const topCompCounts = diversified.slice(0, 5).filter((m) => m.tag === "Serie A").length;
    expect(topCompCounts).toBeLessThanOrEqual(4);
    expect(diversified.some((m) => m.tag === "F1")).toBe(true);
  });

  it("finds match by full slug, id, or final slug segment", () => {
    const matches: SportMatch[] = [premierLeagueMatch];

    expect(findMatchBySlugOrId(matches, "football/premier-league/ars-che")).toEqual(premierLeagueMatch);
    expect(findMatchBySlugOrId(matches, "100")).toEqual(premierLeagueMatch);
    expect(findMatchBySlugOrId(matches, "ars-che")).toEqual(premierLeagueMatch);
    expect(findMatchBySlugOrId(matches, "non-existent")).toBeUndefined();
  });
});
