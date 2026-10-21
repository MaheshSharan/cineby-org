import type { HistoryEntry } from "@/lib/db/types";
import {
  clearLocalHistory,
  getLocalHistory,
  removeLocalHistory,
  saveLocalHistory,
  type HistoryInput,
} from "@/lib/history/local";

export type { HistoryInput };

interface HistoryListResponse {
  items: HistoryEntry[];
}

export async function listHistory(isAuthenticated?: boolean): Promise<HistoryEntry[]> {
  if (isAuthenticated === false) {
    return getLocalHistory();
  }

  try {
    const response = await fetch("/api/history");

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

export async function saveHistory(
  input: HistoryInput,
  isAuthenticated?: boolean
): Promise<void> {
  if (isAuthenticated === false) {
    saveLocalHistory(input);
    return;
  }

  try {
    const response = await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      // Lets the save finish when it is triggered by closing the tab.
      keepalive: true,
    });

    if (response.status === 401) {
      saveLocalHistory(input);
    }
  } catch {
    saveLocalHistory(input);
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
    const response = await fetch(`/api/history?id=${id}`, {
      method: "DELETE",
    });

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
    const response = await fetch("/api/history", {
      method: "DELETE",
    });

    clearLocalHistory();
    return response.ok || response.status === 401;
  } catch {
    return clearLocalHistory();
  }
}

export async function syncGuestHistoryToServer(): Promise<void> {
  const localItems = getLocalHistory();
  if (localItems.length === 0) return;

  try {
    let syncedCount = 0;
    for (const item of localItems) {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      if (res.ok) {
        syncedCount++;
      }
    }

    if (syncedCount > 0) {
      clearLocalHistory();
      window.dispatchEvent(new CustomEvent("cineby:history-change", { detail: [] }));
    }
  } catch {
    // Best effort migration
  }
}