import { describe, expect, it } from "vitest";
import { parseHeroPicksText } from "@/lib/tmdb/server/heroPicks";

describe("parseHeroPicksText", () => {
  it("parses valid movie and tv lines and assigns 1-based positions", () => {
    const raw = `
# Comment line
movie=1400940

tv=105248
movie=1288069
`;
    const result = parseHeroPicksText(raw);
    expect(result).toEqual([
      { mediaType: "movie", id: 1400940, position: 1 },
      { mediaType: "tv", id: 105248, position: 2 },
      { mediaType: "movie", id: 1288069, position: 3 },
    ]);
  });

  it("ignores invalid lines, invalid IDs, and duplicates", () => {
    const raw = `
# Header
random_garbage
movie=not_a_number
movie=-5
movie=100
tv=200
movie=100 # duplicate should be ignored
tv=200    # duplicate should be ignored
`;
    const result = parseHeroPicksText(raw);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ mediaType: "movie", id: 100, position: 1 });
    expect(result[1]).toEqual({ mediaType: "tv", id: 200, position: 2 });
  });

  it("handles empty or comment-only string gracefully", () => {
    expect(parseHeroPicksText("")).toEqual([]);
    expect(parseHeroPicksText("# only comments\n# second comment")).toEqual([]);
  });
});
