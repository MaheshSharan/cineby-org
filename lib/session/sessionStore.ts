import { apiFetch } from "@/lib/api/client";
import { isLoggedInFlagSet } from "@/lib/auth/loggedInFlag";
import type { User } from "@/lib/db/types";
import type { PublicProfile } from "@/lib/profile/publicProfile";
import { type CinebySettings, normalizeApiSettings } from "@/lib/settings/types";

const SNAPSHOT_STORAGE_KEY = "cineby_session_snapshot_v1";
// A signed-in page load within this window costs no request. Revoking a session elsewhere shows up
// here at the next API call (which returns 401) or when this window ends, whichever comes first.
export const SESSION_SNAPSHOT_TTL_MS = 30 * 60 * 1000;
const PROFILE_CHANGE_EVENT = "cineby:profile-change";

export interface SessionSnapshot {
  user: User;
  profiles: PublicProfile[];
  activeProfileId: number | null;
  settings: CinebySettings;
  fetchedAt: number;
}

let memorySnapshot: SessionSnapshot | null = null;
let inFlightLoad: Promise<SessionSnapshot | null> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBootstrap(data: unknown, fetchedAt: number): SessionSnapshot | null {
  if (!isRecord(data) || !isRecord(data.user) || typeof data.user.id !== "number") return null;
  if (!Array.isArray(data.profiles)) return null;

  const activeProfileId = typeof data.activeProfileId === "number" ? data.activeProfileId : null;

  return {
    user: data.user as unknown as User,
    profiles: data.profiles as PublicProfile[],
    activeProfileId,
    settings: normalizeApiSettings(data.settings),
    fetchedAt,
  };
}

function isFresh(snapshot: SessionSnapshot, now: number): boolean {
  return now - snapshot.fetchedAt < SESSION_SNAPSHOT_TTL_MS;
}

function persistSnapshot(snapshot: SessionSnapshot | null): void {
  if (typeof localStorage === "undefined") return;

  try {
    if (snapshot) {
      localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
    } else {
      localStorage.removeItem(SNAPSHOT_STORAGE_KEY);
    }
  } catch {
    // Storage blocked or full: the snapshot then only lives in memory, which costs one extra request per page load.
  }
}

function readPersistedSnapshot(): SessionSnapshot | null {
  if (typeof localStorage === "undefined") return null;

  try {
    const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    const fetchedAt = isRecord(parsed) && typeof parsed.fetchedAt === "number" ? parsed.fetchedAt : 0;
    return parseBootstrap(parsed, fetchedAt);
  } catch {
    return null;
  }
}

export function clearSessionSnapshot(): void {
  memorySnapshot = null;
  persistSnapshot(null);
}

/** The current snapshot without any network call, or null when there is none or it has expired. */
export function readSessionSnapshot(): SessionSnapshot | null {
  if (!isLoggedInFlagSet()) return null;

  const candidate = memorySnapshot ?? readPersistedSnapshot();
  if (!candidate || !isFresh(candidate, Date.now())) return null;

  memorySnapshot = candidate;
  return candidate;
}

async function fetchSession(): Promise<SessionSnapshot | null> {
  const response = await apiFetch("/api/bootstrap");

  if (!response.ok) {
    clearSessionSnapshot();
    return null;
  }

  const snapshot = parseBootstrap(await response.json(), Date.now());
  if (!snapshot) {
    clearSessionSnapshot();
    return null;
  }

  memorySnapshot = snapshot;
  persistSnapshot(snapshot);
  return snapshot;
}

/**
 * Returns the signed-in user's session data, from the snapshot when it is fresh and from one
 * /api/bootstrap request otherwise. Concurrent callers share a single request.
 * Returns null for visitors who are not signed in, without any request.
 */
export async function loadSession(options: { force?: boolean } = {}): Promise<SessionSnapshot | null> {
  if (!isLoggedInFlagSet()) {
    clearSessionSnapshot();
    return null;
  }

  if (!options.force) {
    const cached = readSessionSnapshot();
    if (cached) return cached;
  }

  if (!inFlightLoad) {
    inFlightLoad = fetchSession().finally(() => {
      inFlightLoad = null;
    });
  }

  return inFlightLoad;
}

function updateSnapshot(update: (snapshot: SessionSnapshot) => SessionSnapshot): void {
  const current = memorySnapshot ?? readPersistedSnapshot();
  if (!current) return;

  memorySnapshot = update(current);
  persistSnapshot(memorySnapshot);
}

export function updateSessionSettings(settings: CinebySettings): void {
  updateSnapshot((snapshot) => ({ ...snapshot, settings }));
}

export function updateSessionProfiles(profiles: PublicProfile[], activeProfileId: number | null): void {
  updateSnapshot((snapshot) => ({ ...snapshot, profiles, activeProfileId }));
}

// Switching or editing a profile changes the active profile the server reports for this session,
// so the next page load must ask again instead of trusting the snapshot.
if (typeof window !== "undefined") {
  window.addEventListener(PROFILE_CHANGE_EVENT, clearSessionSnapshot);
}
