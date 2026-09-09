import { getDb } from "./connection";
import { findDefaultProfileId } from "./profiles";
import type { WatchlistItem } from "./types";

export interface WatchlistInput {
  mediaType: "movie" | "tv";
  mediaId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
}

interface WatchlistRow {
  id: number;
  user_id: number;
  media_type: "movie" | "tv";
  media_id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  added_at: string;
}

export async function addToWatchlist(userId: number, input: WatchlistInput, profileId?: number): Promise<void> {
  const effectiveProfileId = profileId ?? (await findDefaultProfileId(userId));
  // No profile yet (user is still onboarding): nothing to scope the item to.
  if (effectiveProfileId === null) return;

  await getDb().run(
    `INSERT INTO watchlist (user_id, profile_id, media_type, media_id, title, poster_path, backdrop_path, added_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (profile_id, media_type, media_id) DO NOTHING`,
    [
      userId,
      effectiveProfileId,
      input.mediaType,
      input.mediaId,
      input.title,
      input.posterPath,
      input.backdropPath,
      new Date().toISOString(),
    ]
  );
}

export async function removeFromWatchlist(userId: number, mediaType: string, mediaId: number, profileId?: number): Promise<void> {
  const effectiveProfileId = profileId ?? (await findDefaultProfileId(userId));
  if (effectiveProfileId === null) return;

  await getDb().run(
    "DELETE FROM watchlist WHERE user_id = ? AND profile_id = ? AND media_type = ? AND media_id = ?",
    [userId, effectiveProfileId, mediaType, mediaId]
  );
}

export async function clearWatchlist(userId: number, profileId?: number): Promise<void> {
  const effectiveProfileId = profileId ?? (await findDefaultProfileId(userId));
  if (effectiveProfileId === null) return;

  await getDb().run("DELETE FROM watchlist WHERE user_id = ? AND profile_id = ?", [userId, effectiveProfileId]);
}

export async function isInWatchlist(userId: number, mediaType: string, mediaId: number, profileId?: number): Promise<boolean> {
  const effectiveProfileId = profileId ?? (await findDefaultProfileId(userId));
  if (effectiveProfileId === null) return false;

  const row = await getDb().get<{ present: number }>(
    "SELECT 1 AS present FROM watchlist WHERE user_id = ? AND profile_id = ? AND media_type = ? AND media_id = ?",
    [userId, effectiveProfileId, mediaType, mediaId]
  );

  return row !== null;
}

export async function listWatchlist(userId: number, profileId?: number): Promise<WatchlistItem[]> {
  const effectiveProfileId = profileId ?? (await findDefaultProfileId(userId));
  if (effectiveProfileId === null) return [];

  const rows = await getDb().all<WatchlistRow>(
    "SELECT * FROM watchlist WHERE user_id = ? AND profile_id = ? ORDER BY added_at DESC",
    [userId, effectiveProfileId]
  );

  return rows.map((row) => ({
    id: row.id,
    mediaType: row.media_type,
    mediaId: row.media_id,
    title: row.title,
    posterPath: row.poster_path,
    backdropPath: row.backdrop_path,
    addedAt: row.added_at,
  }));
}
