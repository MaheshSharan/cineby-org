import type { HistoryEntry } from "@/lib/db/types";

export const MAX_CONTINUE_WATCHING_ITEMS = 20;

// Below this a title was only opened; at or above it the title counts as finished.
const MIN_IN_PROGRESS_PERCENT = 0;
const FINISHED_PERCENT = 95;

export function isSameTitle(a: HistoryEntry, b: HistoryEntry): boolean {
  return a.mediaType === b.mediaType && a.mediaId === b.mediaId;
}

function isInProgress(entry: HistoryEntry): boolean {
  return entry.progress !== null && entry.progress > MIN_IN_PROGRESS_PERCENT && entry.progress < FINISHED_PERCENT;
}

/**
 * History holds one entry per episode. The row shows each title once, using its most recently watched
 * entry, and only while that entry is in progress.
 */
export function selectContinueWatching(entries: HistoryEntry[]): HistoryEntry[] {
  const newestFirst = [...entries].sort((a, b) => Date.parse(b.watchedAt) - Date.parse(a.watchedAt));
  const latestPerTitle = newestFirst.filter(
    (entry, index) => newestFirst.findIndex((other) => isSameTitle(other, entry)) === index
  );

  return latestPerTitle.filter(isInProgress).slice(0, MAX_CONTINUE_WATCHING_ITEMS);
}
