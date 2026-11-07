import { describe, expect, it } from "vitest";

import { toTitleBackdropPath } from "@/lib/tmdb/server/transform";

describe("toTitleBackdropPath", () => {
  it("picks the best-rated English backdrop, which carries the title text", () => {
    const images = {
      backdrops: [
        { iso_639_1: null, file_path: "/textless.jpg", vote_average: 9 },
        { iso_639_1: "en", file_path: "/english-low.jpg", vote_average: 3 },
        { iso_639_1: "en", file_path: "/english-best.jpg", vote_average: 5 },
        { iso_639_1: "fr", file_path: "/french.jpg", vote_average: 8 },
      ],
    };

    expect(toTitleBackdropPath(images)).toBe("/english-best.jpg");
  });

  it("returns null when TMDB has no English backdrop or no images", () => {
    expect(toTitleBackdropPath({ backdrops: [{ iso_639_1: null, file_path: "/textless.jpg" }] })).toBeNull();
    expect(toTitleBackdropPath(undefined)).toBeNull();
  });
});
