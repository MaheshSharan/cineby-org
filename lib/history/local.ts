import type { HistoryEntry } from "@/lib/db/types";

const GUEST_HISTORY_STORAGE_KEY = "cineby_guest_history";
const MAX_GUEST_ENTRIES = 60;

export interface HistoryInput {
  mediaType: "movie" | "tv";
  mediaId: number;
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  duration?: string | null;
  progress: number;
  progressSeconds: number;
}

export function getLocalHistory(): HistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(GUEST_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalHistory(input: HistoryInput): HistoryEntry {
  const now = new Date().toISOString();
  if (typeof window === "undefined") {
    return {
      id: 0,
      mediaType: input.mediaType,
      mediaId: input.mediaId,
      title: input.title,
      posterPath: input.posterPath ?? null,
      backdropPath: input.backdropPath ?? null,
      seasonNumber: input.seasonNumber ?? null,
      episodeNumber: input.episodeNumber ?? null,
      duration: input.duration ?? null,
      progress: input.progress,
      progressSeconds: input.progressSeconds,
      watchedAt: now,
    };
  }

  const existing = getLocalHistory();

  // Find if media already exists (match mediaType, mediaId, and for TV also season & episode)
  const existingIndex = existing.findIndex(
    (item) =>
      item.mediaType === input.mediaType &&
      item.mediaId === input.mediaId &&
      (input.mediaType !== "tv" ||
        (item.seasonNumber === (input.seasonNumber ?? null) &&
          item.episodeNumber === (input.episodeNumber ?? null)))
  );

  const entry: HistoryEntry = {
    id: existingIndex >= 0 ? existing[existingIndex].id : Date.now(),
    mediaType: input.mediaType,
    mediaId: input.mediaId,
    title: input.title,
    posterPath: input.posterPath ?? null,
    backdropPath: input.backdropPath ?? null,
    seasonNumber: input.seasonNumber ?? null,
    episodeNumber: input.episodeNumber ?? null,
    duration: input.duration ?? null,
    progress: input.progress,
    progressSeconds: input.progressSeconds,
    watchedAt: now,
  };

  let updatedList: HistoryEntry[];
  if (existingIndex >= 0) {
    updatedList = [
      entry,
      ...existing.slice(0, existingIndex),
      ...existing.slice(existingIndex + 1),
    ];
  } else {
    updatedList = [entry, ...existing].slice(0, MAX_GUEST_ENTRIES);
  }

  try {
    localStorage.setItem(GUEST_HISTORY_STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new CustomEvent("cineby:history-change", { detail: updatedList }));
  } catch {
    // Quota or private browsing fallback
  }

  return entry;
}

export function removeLocalHistory(id: number | string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const existing = getLocalHistory();
    const updated = existing.filter((item) => String(item.id) !== String(id));
    localStorage.setItem(GUEST_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("cineby:history-change", { detail: updated }));
    return true;
  } catch {
    return false;
  }
}

export function clearLocalHistory(): boolean {
  if (typeof window === "undefined") return false;

  try {
    localStorage.removeItem(GUEST_HISTORY_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("cineby:history-change", { detail: [] }));
    return true;
  } catch {
    return false;
  }
}
