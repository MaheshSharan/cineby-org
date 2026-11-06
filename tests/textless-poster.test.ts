import { describe, expect, it } from "vitest";

import { toTextlessPosterPath } from "@/lib/tmdb/server/transform";

describe("toTextlessPosterPath", () => {
  it("picks the best-rated poster without a language", () => {
    const images = {
      posters: [
        { file_path: "/en.jpg", iso_639_1: "en", width: 2000, vote_average: 9 },
        { file_path: "/low.jpg", iso_639_1: null, width: 2000, vote_average: 3 },
        { file_path: "/best.jpg", iso_639_1: null, width: 1000, vote_average: 5 },
      ],
    };
    expect(toTextlessPosterPath(images)).toBe("/best.jpg");
  });

  it("ignores small posters and returns null when none qualify", () => {
    const images = { posters: [{ file_path: "/small.jpg", iso_639_1: null, width: 400, vote_average: 8 }] };
    expect(toTextlessPosterPath(images)).toBeNull();
    expect(toTextlessPosterPath({})).toBeNull();
  });
});
