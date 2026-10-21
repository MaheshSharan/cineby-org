import { describe, expect, it } from "vitest";
import { getHeroPicksMedia } from "@/lib/tmdb/server/heroPicks";
import { HERO_SPOTLIGHT_PICKS } from "@/lib/constants/heroPicks";

describe("Hero Spotlight Picks", () => {
  it("defines valid spotlight items with mediaType and positive id", () => {
    expect(HERO_SPOTLIGHT_PICKS.length).toBeGreaterThan(0);
    for (const item of HERO_SPOTLIGHT_PICKS) {
      expect(["movie", "tv"]).toContain(item.mediaType);
      expect(item.id).toBeGreaterThan(0);
    }
  });

  it("handles empty picks gracefully without throwing", async () => {
    const result = await getHeroPicksMedia([]);
    expect(result).toEqual([]);
  });
});
