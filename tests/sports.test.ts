import { describe, expect, it } from "vitest";
import { calculateMatchScore, isMatchLive, isMatchUpcoming, findMatchBySlugOrId } from "@/lib/sports/sportsService";
import { type SportMatch, getSportWatchHref } from "@/lib/sports/types";

describe("sportsService logic", () => {
  const baseMatch: SportMatch = {
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

  it("generates correct watch hrefs", () => {
    expect(getSportWatchHref("nfl-network")).toBe("/sports/nfl-network");
    expect(getSportWatchHref("football/premier-league/ars-che")).toBe("/sports/football/premier-league/ars-che");
    expect(getSportWatchHref("/sports/sample")).toBe("/sports/sports/sample");
  });

  it("identifies match live state correctly", () => {
    expect(isMatchLive(baseMatch, 1500)).toBe(true);
    expect(isMatchLive(baseMatch, 500)).toBe(false);
    expect(isMatchLive(baseMatch, 2500)).toBe(false);

    const alwaysLiveMatch: SportMatch = { ...baseMatch, always_live: 1 };
    expect(isMatchLive(alwaysLiveMatch, 500)).toBe(true);
  });

  it("identifies upcoming match state correctly", () => {
    expect(isMatchUpcoming(baseMatch, 500)).toBe(true);
    expect(isMatchUpcoming(baseMatch, 1500)).toBe(false);
    expect(isMatchUpcoming(baseMatch, 2500)).toBe(false);

    const alwaysLiveMatch: SportMatch = { ...baseMatch, always_live: 1 };
    expect(isMatchUpcoming(alwaysLiveMatch, 500)).toBe(false);
  });

  it("prioritizes live matches and major leagues in score calculation", () => {
    const liveScore = calculateMatchScore(baseMatch, 1500);
    const upcomingScore = calculateMatchScore(baseMatch, 500);

    expect(liveScore).toBeGreaterThan(upcomingScore);
    expect(liveScore).toBeGreaterThan(10000); // Has live bonus + premier league bonus + viewers bonus
  });

  it("finds match by full slug, id, or final slug segment", () => {
    const matches: SportMatch[] = [baseMatch];

    expect(findMatchBySlugOrId(matches, "football/premier-league/ars-che")).toEqual(baseMatch);
    expect(findMatchBySlugOrId(matches, "100")).toEqual(baseMatch);
    expect(findMatchBySlugOrId(matches, "ars-che")).toEqual(baseMatch);
    expect(findMatchBySlugOrId(matches, "non-existent")).toBeUndefined();
  });
});
