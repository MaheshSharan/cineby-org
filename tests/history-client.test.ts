import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { listHistory, syncGuestHistoryToServer } from "@/lib/api/history";
import { saveLocalHistory } from "@/lib/history/local";
import { queueHistorySave, resetHistoryQueue } from "@/lib/history/writeQueue";

describe("lib/api/history client guard", () => {
  let store: Record<string, string> = {};
  let sessionStore: Record<string, string> = {};
  let cookieVal = "";

  beforeEach(() => {
    store = {};
    sessionStore = {};
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
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => sessionStore[key] ?? null,
      setItem: (key: string, val: string) => {
        sessionStore[key] = String(val);
      },
    });
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

  describe("syncGuestHistoryToServer", () => {
    function seedLocalHistory(count: number) {
      for (let i = 1; i <= count; i++) {
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
    }

    function batchBody(fetchSpy: ReturnType<typeof vi.spyOn>): { items: Array<{ mediaId: number }> } {
      const init = fetchSpy.mock.calls[0][1] as RequestInit;
      return JSON.parse(String(init.body)) as { items: Array<{ mediaId: number }> };
    }

    it("merges the newest 10 entries in one batch request and clears local history", async () => {
      seedLocalHistory(12);
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 201 })
      );

      await syncGuestHistoryToServer();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith("/api/history/batch", expect.objectContaining({ method: "POST" }));

      const body = batchBody(fetchSpy);
      expect(body.items).toHaveLength(10);
      expect(body.items[0].mediaId).toBe(12);
      expect(await listHistory(false)).toHaveLength(0);
    });

    it("does nothing when there is no local history", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      await syncGuestHistoryToServer();

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("keeps local history and does not retry in the same session after a server error", async () => {
      seedLocalHistory(2);
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 500 }));

      await syncGuestHistoryToServer();
      await syncGuestHistoryToServer();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(await listHistory(false)).toHaveLength(2);
    });

    it("retries when forced, for example after selecting a profile", async () => {
      seedLocalHistory(2);
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response("{}", { status: 500 }))
        .mockResolvedValueOnce(new Response("{}", { status: 201 }));

      await syncGuestHistoryToServer();
      await syncGuestHistoryToServer({ force: true });

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(await listHistory(false)).toHaveLength(0);
    });

    it("clears the logged-in flag and keeps local history on 401", async () => {
      document.cookie = "cineby_logged_in=1";
      seedLocalHistory(1);
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 401 }));

      await syncGuestHistoryToServer();

      expect(document.cookie).not.toContain("cineby_logged_in=1");
      expect(await listHistory(false)).toHaveLength(1);
    });

    it("keeps local history when the network request fails", async () => {
      seedLocalHistory(1);
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("network down"));

      await syncGuestHistoryToServer();

      expect(await listHistory(false)).toHaveLength(1);
    });
  });
});
