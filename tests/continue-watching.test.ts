import { describe, expect, it } from "vitest";

import type { HistoryEntry } from "@/lib/db/types";
import { MAX_CONTINUE_WATCHING_ITEMS, selectContinueWatching } from "@/lib/history/continueWatching";
import { canSkipServerLookup } from "@/lib/history/continueState";

function entry(overrides: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: 1,
    mediaType: "movie",
    mediaId: 1,
    title: "Title",
    posterPath: null,
    backdropPath: null,
    seasonNumber: null,
    episodeNumber: null,
    duration: null,
    progress: 50,
    progressSeconds: 100,
    watchedAt: "2026-11-08T10:00:00.000Z",
    ...overrides,
  };
}

describe("selectContinueWatching", () => {
  it("keeps only titles that are in progress", () => {
    const result = selectContinueWatching([
      entry({ id: 1, mediaId: 1, progress: 0 }),
      entry({ id: 2, mediaId: 2, progress: 40 }),
      entry({ id: 3, mediaId: 3, progress: 95 }),
      entry({ id: 4, mediaId: 4, progress: null }),
    ]);

    expect(result.map((item) => item.id)).toEqual([2]);
  });

  it("shows a series once, using its most recently watched episode", () => {
    const result = selectContinueWatching([
      entry({ id: 1, mediaType: "tv", mediaId: 7, episodeNumber: 1, watchedAt: "2026-11-01T10:00:00.000Z" }),
      entry({ id: 2, mediaType: "tv", mediaId: 7, episodeNumber: 4, watchedAt: "2026-11-05T10:00:00.000Z" }),
    ]);

    expect(result.map((item) => item.id)).toEqual([2]);
  });

  it("hides a series whose latest episode is finished", () => {
    const result = selectContinueWatching([
      entry({ id: 1, mediaType: "tv", mediaId: 7, progress: 60, watchedAt: "2026-11-01T10:00:00.000Z" }),
      entry({ id: 2, mediaType: "tv", mediaId: 7, progress: 99, watchedAt: "2026-11-05T10:00:00.000Z" }),
    ]);

    expect(result).toEqual([]);
  });

  it("orders newest first and caps the row", () => {
    const entries = Array.from({ length: MAX_CONTINUE_WATCHING_ITEMS + 5 }, (_, index) =>
      entry({ id: index + 1, mediaId: index + 1, watchedAt: new Date(Date.UTC(2026, 10, 1, 0, index)).toISOString() })
    );

    const result = selectContinueWatching(entries);

    expect(result).toHaveLength(MAX_CONTINUE_WATCHING_ITEMS);
    expect(result[0].id).toBe(MAX_CONTINUE_WATCHING_ITEMS + 5);
  });
});

describe("canSkipServerLookup", () => {
  const now = 1_000_000;

  it("skips only when the last check found nothing and is recent", () => {
    expect(canSkipServerLookup({ hasItems: false, checkedAt: now - 60_000 }, now)).toBe(true);
  });

  it("asks the server when there were items, the check is old, or nothing is cached", () => {
    expect(canSkipServerLookup({ hasItems: true, checkedAt: now - 60_000 }, now)).toBe(false);
    expect(canSkipServerLookup({ hasItems: false, checkedAt: now - 10 * 60_000 }, now)).toBe(false);
    expect(canSkipServerLookup(null, now)).toBe(false);
  });
});
