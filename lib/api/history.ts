import type { HistoryEntry } from "@/lib/db/types";
import { apiFetch, sendJson } from "@/lib/api/client";
import { isLoggedInFlagSet } from "@/lib/auth/loggedInFlag";
import {
  clearLocalHistory,
  getLocalHistory,
  removeLocalHistory,
  type HistoryInput,
} from "@/lib/history/local";

export type { HistoryInput };

interface HistoryListResponse {
  items: HistoryEntry[];
}

const isClientLoggedIn = isLoggedInFlagSet;

export async function listHistory(isAuthenticated?: boolean): Promise<HistoryEntry[]> {
  if (isAuthenticated === false || !isClientLoggedIn()) {
    return getLocalHistory();
  }

  try {
    const response = await apiFetch("/api/history");

    if (response.status === 401) {
      return getLocalHistory();
    }

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as HistoryListResponse;
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return getLocalHistory();
  }
}

export type HistorySendResult = "saved" | "unauthorized" | "failed";

/**
 * Sends one progress entry to the server. Never throws: the write queue decides what to do with
 * each outcome, so network errors are reported as "failed" instead of being swallowed here.
 */
export async function postHistoryEntry(input: HistoryInput, keepalive: boolean): Promise<HistorySendResult> {
  try {
    // keepalive lets the save finish when it is triggered by closing the tab.
    const response = await sendJson("/api/history", "POST", input, { keepalive });

    if (response.status === 401) {
      return "unauthorized";
    }

    return response.ok ? "saved" : "failed";
  } catch {
    return "failed";
  }
}

export async function removeFromHistory(
  id: number | string,
  isAuthenticated?: boolean
): Promise<boolean> {
  if (isAuthenticated === false || typeof id === "string") {
    return removeLocalHistory(id);
  }

  try {
    const response = await apiFetch(`/api/history?id=${id}`, { method: "DELETE" });

    if (response.status === 401) {
      return removeLocalHistory(id);
    }

    removeLocalHistory(id);
    return response.ok;
  } catch {
    return removeLocalHistory(id);
  }
}

export async function clearAllHistory(isAuthenticated?: boolean): Promise<boolean> {
  if (isAuthenticated === false) {
    return clearLocalHistory();
  }

  try {
    const response = await apiFetch("/api/history", { method: "DELETE" });

    clearLocalHistory();
    return response.ok || response.status === 401;
  } catch {
    return clearLocalHistory();
  }
}

const GUEST_SYNC_ATTEMPTED_KEY = "cineby_history_sync_attempted";
const GUEST_SYNC_MAX_ITEMS = 10;

function wasGuestSyncAttempted(): boolean {
  if (typeof sessionStorage === "undefined") return false;

  try {
    return sessionStorage.getItem(GUEST_SYNC_ATTEMPTED_KEY) === "1";
  } catch {
    // Storage blocked (private mode): treat as not attempted so the merge still runs.
    return false;
  }
}

function markGuestSyncAttempted(): void {
  if (typeof sessionStorage === "undefined") return;

  try {
    sessionStorage.setItem(GUEST_SYNC_ATTEMPTED_KEY, "1");
  } catch {
    // Storage blocked (private mode): the merge may repeat on the next page load, which is harmless.
  }
}

/**
 * Merges the guest's local history into the signed-in account with a single request.
 * Runs at most once per browser session unless forced (a newly selected or created profile),
 * and leaves local history untouched when the server does not accept it.
 */
export async function syncGuestHistoryToServer(options: { force?: boolean } = {}): Promise<void> {
  const localItems = getLocalHistory();
  if (localItems.length === 0) return;
  if (!options.force && wasGuestSyncAttempted()) return;

  markGuestSyncAttempted();

  // Local history is stored newest first, which the server relies on when a title appears twice.
  const items = localItems.slice(0, GUEST_SYNC_MAX_ITEMS).map((item) => ({
    mediaType: item.mediaType,
    mediaId: item.mediaId,
    title: item.title,
    posterPath: item.posterPath,
    backdropPath: item.backdropPath,
    seasonNumber: item.seasonNumber,
    episodeNumber: item.episodeNumber,
    duration: item.duration,
    progress: item.progress,
    progressSeconds: item.progressSeconds,
  }));

  try {
    const response = await sendJson("/api/history/batch", "POST", { items });

    if (response.status === 401) {
      return;
    }

    if (response.ok) {
      clearLocalHistory();
    }
  } catch {
    // Best effort merge: local history stays untouched and is retried in the next session.
  }
}
