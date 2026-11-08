import { listHistory } from "@/lib/api/history";
import { flushHistoryQueue } from "@/lib/history/writeQueue";

export interface ResumeTarget {
  mediaType: "movie" | "tv";
  mediaId: number;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

/**
 * Where playback should continue after the player is reloaded (for example a server switch).
 * Continue watching is the source of truth because it also holds progress made on another server or device;
 * only a title with no saved position falls back to the time the viewer had reached in this player.
 */
export async function resolveResumeSeconds(target: ResumeTarget, liveSeconds: number, isAuthenticated: boolean): Promise<number> {
  // Pending progress from this tab must reach the saved history before it is read back.
  await flushHistoryQueue();

  const entries = await listHistory(isAuthenticated);
  const saved = entries.find(
    (entry) =>
      entry.mediaType === target.mediaType &&
      entry.mediaId === target.mediaId &&
      (target.mediaType === "movie" ||
        (entry.seasonNumber === target.seasonNumber && entry.episodeNumber === target.episodeNumber))
  );

  return saved?.progressSeconds && saved.progressSeconds > 0 ? saved.progressSeconds : liveSeconds;
}
