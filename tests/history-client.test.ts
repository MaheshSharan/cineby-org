import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { listHistory, syncGuestHistoryToServer } from "@/lib/api/history";
import { saveLocalHistory } from "@/lib/history/local";
import { queueHistorySave, resetHistoryQueue } from "@/lib/history/writeQueue";

describe("lib/api/history client guard", () => {
  let store: Record<string, string> = {};
  let cookieVal = "";

  beforeEach(() => {
    store = {};
    cookieVal = "";
    vi.restoreAllMocks();
    resetHistoryQueue();

    const mockLocalStorage = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        store[key] = String(val);
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };

    const mockDocument = {
      get cookie() {
        return cookieVal;
      },
      set cookie(val: string) {
        cookieVal = val;
      },
    };

    vi.stubGlobal("window", {
      localStorage: mockLocalStorage,
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal("localStorage", mockLocalStorage);
    vi.stubGlobal("document", mockDocument);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not fetch /api/history when user is guest (isAuthenticated=false)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await queueHistorySave(
      {
        mediaType: "movie",
        mediaId: 101,
        title: "Test Movie",
        posterPath: null,
        backdropPath: null,
        duration: "120",
        progress: 10,
        progressSeconds: 120,
      },
      false
    );

    expect(fetchSpy).not.toHaveBeenCalled();

    const items = await listHistory(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(items).toHaveLength(1);
    expect(items[0].mediaId).toBe(101);
  });

  it("does not fetch /api/history when listing with no auth hint and cineby_logged_in cookie is missing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    saveLocalHistory({
      mediaType: "movie",
      mediaId: 202,
      title: "Guest Inferred",
      posterPath: null,
      backdropPath: null,
      duration: "120",
      progress: 25,
      progressSeconds: 300,
    });

    expect(fetchSpy).not.toHaveBeenCalled();

    const items = await listHistory(undefined);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(items.some((i) => i.mediaId === 202)).toBe(true);
  });

  it("fetches /api/history when authenticated and falls back to local on 401", async () => {
    document.cookie = "cineby_logged_in=1";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );

    await queueHistorySave(
      {
        mediaType: "movie",
        mediaId: 303,
        title: "Auth Movie",
        posterPath: null,
        backdropPath: null,
        duration: "120",
        progress: 50,
        progressSeconds: 600,
      },
      true
    );

    expect(fetchSpy).toHaveBeenCalledWith("/api/history", expect.objectContaining({ method: "POST" }));
    const items = await listHistory(false);
    expect(items.some((i) => i.mediaId === 303)).toBe(true);
  });

  it("syncGuestHistoryToServer limits migration to top 5 items", async () => {
    // Populate 7 local items
    for (let i = 1; i <= 7; i++) {
      saveLocalHistory({
        mediaType: "movie",
        mediaId: i,
        title: `Movie ${i}`,
        posterPath: null,
        backdropPath: null,
        duration: "100",
        progress: i * 10,
        progressSeconds: i * 100,
      });
    }

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    await syncGuestHistoryToServer();

    expect(fetchSpy).toHaveBeenCalledTimes(5);
  });
});
