import { describe, expect, it } from "vitest";

import { isTakenDown, TAKEDOWN_REDIRECT, withoutTakenDown } from "@/lib/takedowns";
import { TAKEDOWN_LIST } from "@/lib/takedowns/takedownList";
import { toMediaSummary, toPaginated } from "@/lib/tmdb/server/transform";

describe("takedowns", () => {
  it("matches a listed title by media type and id, as a string or a number", () => {
    expect(isTakenDown("movie", "1798903")).toBe(true);
    expect(isTakenDown("movie", 791523)).toBe(true);
  });

  it("does not match the same id under another media type or an unlisted id", () => {
    expect(isTakenDown("tv", 1798903)).toBe(false);
    expect(isTakenDown("movie", 603)).toBe(false);
  });

  it("lists each title once", () => {
    const keys = TAKEDOWN_LIST.map((entry) => `${entry.mediaType}:${entry.id}`);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("drops listed titles from a list and keeps the rest", () => {
    const items = [
      { id: 1798903, mediaType: "movie" as const },
      { id: 603, mediaType: "movie" as const },
    ];

    expect(withoutTakenDown(items)).toEqual([{ id: 603, mediaType: "movie" }]);
  });

  it("removes listed titles from TMDB list pages", () => {
    const page = toPaginated(
      [{ id: 1798903, title: "Killsave" }, { id: 603, title: "The Matrix" }],
      1,
      1,
      2,
      (item) => toMediaSummary(item, "movie")
    );

    expect(page.results.map((item) => item.id)).toEqual([603]);
  });

  it("redirects to the home page without a permanent redirect", () => {
    expect(TAKEDOWN_REDIRECT).toEqual({ destination: "/", permanent: false });
  });
});
