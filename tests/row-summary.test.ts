import { describe, expect, it } from "vitest";

import { toRowSummary } from "@/lib/tmdb/rowSummary";
import type { MediaSummary } from "@/lib/tmdb";

const fullItem: MediaSummary = {
  id: 1368337,
  title: "The Odyssey",
  overview: "A long description that only the hero and the number one card ever show.",
  posterPath: "/poster.jpg",
  backdropPath: "/backdrop.jpg",
  releaseDate: "2026-07-17",
  voteAverage: 8.0,
  voteCount: 1234,
  genreIds: [12, 14],
  mediaType: "movie",
  originalLanguage: "en",
  popularity: 987.6,
};

describe("toRowSummary", () => {
  it("drops the fields a card row never draws", () => {
    const summary = toRowSummary(fullItem);

    expect(summary.overview).toBe("");
    expect(summary.genreIds).toEqual([]);
    expect(summary.voteCount).toBe(0);
    expect(summary.popularity).toBe(0);
    expect(summary.originalLanguage).toBe("");
  });

  it("keeps everything a card needs to render and link", () => {
    const summary = toRowSummary(fullItem);

    expect(summary).toMatchObject({
      id: fullItem.id,
      title: fullItem.title,
      posterPath: fullItem.posterPath,
      backdropPath: fullItem.backdropPath,
      releaseDate: fullItem.releaseDate,
      voteAverage: fullItem.voteAverage,
      mediaType: fullItem.mediaType,
    });
  });

  it("does not mutate the item it was given", () => {
    toRowSummary(fullItem);

    expect(fullItem.overview).not.toBe("");
    expect(fullItem.genreIds).toEqual([12, 14]);
  });

  it("makes the serialized row much smaller", () => {
    const before = JSON.stringify(fullItem).length;
    const after = JSON.stringify(toRowSummary(fullItem)).length;

    expect(after).toBeLessThan(before);
  });
});
