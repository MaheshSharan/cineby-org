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

interface HistoryKeyFields {
  mediaType: "movie" | "tv";
  mediaId: number;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

/**
 * Identity of a history entry: a movie is one entry, a TV show has one entry per episode.
 */
function getHistoryKey(item: HistoryKeyFields): string {
  if (item.mediaType !== "tv") return `movie:${item.mediaId}`;
  return `tv:${item.mediaId}:${item.seasonNumber ?? 0}:${item.episodeNumber ?? 0}`;
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
  const entryKey = getHistoryKey(input);
  const previous = existing.find((item) => getHistoryKey(item) === entryKey);

  const entry: HistoryEntry = {
    id: previous?.id ?? Date.now(),
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

  // Most recent first: the entry moves to the top, and the oldest ones fall off the end.
  const others = existing.filter((item) => getHistoryKey(item) !== entryKey);
  const updatedList = [entry, ...others].slice(0, MAX_GUEST_ENTRIES);

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
