import { describe, expect, it } from "vitest";
import { getHeroPicksMedia } from "@/lib/tmdb/server/heroPicks";
import { BACKUP_HERO_SPOTLIGHT_PICKS, HERO_SPOTLIGHT_PICKS } from "@/lib/constants/heroPicks";

describe("Hero Spotlight Picks", () => {
  it("defines valid spotlight fallback items with mediaType and positive id", () => {
    expect(BACKUP_HERO_SPOTLIGHT_PICKS.length).toBeGreaterThan(0);
    for (const item of BACKUP_HERO_SPOTLIGHT_PICKS) {
      expect(["movie", "tv"]).toContain(item.mediaType);
      expect(item.id).toBeGreaterThan(0);
    }
  });

  it("handles empty picks gracefully without throwing", async () => {
    const result = await getHeroPicksMedia([]);
    expect(result).toEqual([]);
  });
});
