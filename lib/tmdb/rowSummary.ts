import type { MediaSummary } from "./types";

/**
 * Card rows draw only the poster, title, year and rating. Everything else is dropped before a
 * row is serialized into the page data, which keeps the homepage HTML small.
 */
export function toRowSummary(item: MediaSummary): MediaSummary {
  return {
    ...item,
    overview: "",
    genreIds: [],
    voteCount: 0,
    popularity: 0,
    originalLanguage: "",
  };
}
