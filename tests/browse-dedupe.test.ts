import { describe, expect, it } from "vitest";

import { dedupeBrowseItems } from "@/lib/tmdb/server/browse";
import type { MediaSummary } from "@/lib/tmdb";

function item(id: number, posterPath: string | null = "/p.jpg"): MediaSummary {
  return { id, mediaType: "movie", title: `Title ${id}`, posterPath } as MediaSummary;
}

describe("dedupeBrowseItems", () => {
  it("keeps the first occurrence of a repeated title", () => {
    expect(dedupeBrowseItems([item(1), item(2), item(1), item(3), item(2)]).map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it("drops titles without a poster", () => {
    expect(dedupeBrowseItems([item(1, null), item(2)]).map((i) => i.id)).toEqual([2]);
  });
});
