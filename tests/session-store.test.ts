import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSessionSnapshot,
  loadSession,
  readSessionSnapshot,
  SESSION_SNAPSHOT_TTL_MS,
  updateSessionProfiles,
  updateSessionSettings,
} from "@/lib/session/sessionStore";
import { DEFAULT_SETTINGS } from "@/lib/settings/types";

const bootstrapBody = {
  user: { id: 7, email: "viewer@example.test", displayName: "Viewer", avatarUrl: null, createdAt: "2026-01-01", activeProfileId: 3, hasProfiles: true },
  profiles: [{ id: 3, name: "Main", avatarUrl: "/avatar/classic-1.png", hasPin: false, movieGenres: [], tvGenres: [] }],
  activeProfileId: 3,
  settings: {},
};

describe("session store", () => {
  let cookie = "";
  let storage: Record<string, string> = {};
  const listeners: Record<string, Array<() => void>> = {};

  function mockBootstrap(status = 200) {
    return vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(JSON.stringify(bootstrapBody), { status }));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T12:00:00Z"));
    cookie = "cineby_logged_in=1";
    storage = {};
    vi.stubGlobal("document", {
      get cookie() {
        return cookie;
      },
      set cookie(value: string) {
        cookie = value;
      },
    });
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = String(value);
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    });
    clearSessionSnapshot();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Object.keys(listeners).forEach((key) => delete listeners[key]);
  });

  it("makes no request for visitors who are not signed in", async () => {
    cookie = "";
    const fetchSpy = mockBootstrap();

    expect(await loadSession()).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("loads user, profiles and settings with one request", async () => {
    const fetchSpy = mockBootstrap();

    const session = await loadSession();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/bootstrap");
    expect(session?.user.id).toBe(7);
    expect(session?.profiles).toHaveLength(1);
    expect(session?.activeProfileId).toBe(3);
    expect(session?.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("reuses a fresh snapshot, including after a page reload", async () => {
    const fetchSpy = mockBootstrap();
    await loadSession();

    clearMemoryOnly();
    await loadSession();
    await loadSession();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("asks again once the snapshot has expired", async () => {
    const fetchSpy = mockBootstrap();
    await loadSession();

    vi.setSystemTime(Date.now() + SESSION_SNAPSHOT_TTL_MS + 1000);
    expect(readSessionSnapshot()).toBeNull();
    await loadSession();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("bypasses the snapshot when forced, for example right after signing in", async () => {
    const fetchSpy = mockBootstrap();
    await loadSession();
    await loadSession({ force: true });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("shares one request between concurrent callers", async () => {
    const fetchSpy = mockBootstrap();

    await Promise.all([loadSession(), loadSession(), loadSession()]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("returns nothing and keeps no snapshot after a 401", async () => {
    mockBootstrap(401);

    expect(await loadSession()).toBeNull();
    expect(readSessionSnapshot()).toBeNull();
    expect(storage["cineby_session_snapshot_v1"]).toBeUndefined();
  });

  it("drops the snapshot once the signed-in hint is gone", async () => {
    mockBootstrap();
    await loadSession();

    cookie = "";

    expect(readSessionSnapshot()).toBeNull();
    expect(await loadSession()).toBeNull();
    expect(storage["cineby_session_snapshot_v1"]).toBeUndefined();
  });

  it("keeps settings and profile edits in the snapshot", async () => {
    mockBootstrap();
    await loadSession();

    const changed = { ...DEFAULT_SETTINGS, appearance: { ...DEFAULT_SETTINGS.appearance, theme: "rose" as const } };
    updateSessionSettings(changed);
    updateSessionProfiles([], null);

    const snapshot = readSessionSnapshot();
    expect(snapshot?.settings.appearance.theme).toBe("rose");
    expect(snapshot?.profiles).toEqual([]);
  });

  it("ignores a damaged stored snapshot", async () => {
    storage["cineby_session_snapshot_v1"] = "{not json";
    const fetchSpy = mockBootstrap();

    await loadSession();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("forgets the snapshot when the active profile changes", async () => {
    const handlers: Array<() => void> = [];
    vi.stubGlobal("window", {
      addEventListener: (_event: string, handler: () => void) => handlers.push(handler),
    });
    vi.resetModules();
    const freshStore = await import("@/lib/session/sessionStore");
    mockBootstrap();

    await freshStore.loadSession();
    expect(freshStore.readSessionSnapshot()).not.toBeNull();

    handlers.forEach((handler) => handler());

    expect(freshStore.readSessionSnapshot()).toBeNull();
  });

  // Simulates a new page load: memory is gone but localStorage survives.
  function clearMemoryOnly() {
    const saved = { ...storage };
    clearSessionSnapshot();
    storage = saved;
  }
});
