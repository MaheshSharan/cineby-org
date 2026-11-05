import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLocalHistory, saveLocalHistory, type HistoryInput } from "@/lib/history/local";

function input(overrides: Partial<HistoryInput> = {}): HistoryInput {
  return { mediaType: "movie", mediaId: 1, title: "Movie", progress: 10, progressSeconds: 100, ...overrides };
}

describe("local history", () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const storage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    };
    vi.stubGlobal("window", { localStorage: storage, dispatchEvent: vi.fn() });
    vi.stubGlobal("localStorage", storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps one entry per movie and moves the latest to the top", () => {
    saveLocalHistory(input({ mediaId: 1, progressSeconds: 100 }));
    saveLocalHistory(input({ mediaId: 2, title: "Other" }));
    saveLocalHistory(input({ mediaId: 1, progressSeconds: 400 }));

    const items = getLocalHistory();

    expect(items.map((item) => item.mediaId)).toEqual([1, 2]);
    expect(items[0].progressSeconds).toBe(400);
  });

  it("keeps the same id when an entry is updated", () => {
    const first = saveLocalHistory(input());
    const second = saveLocalHistory(input({ progressSeconds: 500 }));

    expect(second.id).toBe(first.id);
  });

  it("keeps one entry per TV episode", () => {
    const show = input({ mediaType: "tv", mediaId: 9, title: "Show" });
    saveLocalHistory({ ...show, seasonNumber: 1, episodeNumber: 1 });
    saveLocalHistory({ ...show, seasonNumber: 1, episodeNumber: 2 });
    saveLocalHistory({ ...show, seasonNumber: 1, episodeNumber: 1, progressSeconds: 900 });

    const items = getLocalHistory();

    expect(items).toHaveLength(2);
    expect(items[0].episodeNumber).toBe(1);
    expect(items[0].progressSeconds).toBe(900);
  });

  it("does not mix a movie and a show that share an id", () => {
    saveLocalHistory(input({ mediaType: "movie", mediaId: 5 }));
    saveLocalHistory(input({ mediaType: "tv", mediaId: 5, seasonNumber: 1, episodeNumber: 1 }));

    expect(getLocalHistory()).toHaveLength(2);
  });

  it("drops the oldest entries beyond 60", () => {
    for (let id = 1; id <= 65; id++) {
      saveLocalHistory(input({ mediaId: id }));
    }

    const items = getLocalHistory();

    expect(items).toHaveLength(60);
    expect(items[0].mediaId).toBe(65);
    expect(items.some((item) => item.mediaId === 1)).toBe(false);
  });
});
