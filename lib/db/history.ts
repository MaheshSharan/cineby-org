import type { DbStatement } from "./adapter";
import { getDb } from "./connection";
import { findDefaultProfileId } from "./profiles";
import type { HistoryEntry } from "./types";

export interface HistoryInput {
  mediaType: "movie" | "tv";
  mediaId: number;
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  titleBackdropPath?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  duration?: string | null;
  progress?: number | null;
  progressSeconds?: number | null;
}

interface HistoryRow {
  id: number;
  user_id: number;
  media_type: "movie" | "tv";
  media_id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  title_backdrop_path: string | null;
  season_number: number | null;
  episode_number: number | null;
  duration: string | null;
  progress: number | null;
  progress_seconds: number | null;
  watched_at: string;
}

// D1 bills every row and index entry it writes. The WHERE clause turns an upsert that would
// change nothing meaningful (same playback position, same episode) into a no-op with zero writes.
const UPSERT_HISTORY_SQL = `INSERT INTO watch_history (
      user_id, profile_id, media_type, media_id, title,
      poster_path, backdrop_path, title_backdrop_path, season_number, episode_number,
      duration, progress, progress_seconds, watched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(profile_id, media_type, media_id) DO UPDATE SET
      title = excluded.title,
      poster_path = excluded.poster_path,
      backdrop_path = excluded.backdrop_path,
      title_backdrop_path = excluded.title_backdrop_path,
      season_number = excluded.season_number,
      episode_number = excluded.episode_number,
      duration = excluded.duration,
      progress = excluded.progress,
      progress_seconds = excluded.progress_seconds,
      watched_at = excluded.watched_at
    WHERE watch_history.progress_seconds IS NOT excluded.progress_seconds
      OR watch_history.season_number IS NOT excluded.season_number
      OR watch_history.episode_number IS NOT excluded.episode_number`;

function buildUpsertStatement(userId: number, profileId: number, input: HistoryInput): DbStatement {
  return {
    sql: UPSERT_HISTORY_SQL,
    params: [
      userId,
      profileId,
      input.mediaType,
      input.mediaId,
      input.title,
      input.posterPath ?? null,
      input.backdropPath ?? null,
      input.titleBackdropPath ?? null,
      input.seasonNumber ?? null,
      input.episodeNumber ?? null,
      input.duration ?? null,
      input.progress ?? null,
      input.progressSeconds ?? null,
      new Date().toISOString(),
    ],
  };
}

export async function addHistoryEntry(userId: number, profileId: number | undefined, input: HistoryInput): Promise<void> {
  const effectiveProfileId = profileId ?? (await findDefaultProfileId(userId));
  // No profile yet (user is still onboarding): nothing to scope the entry to.
  if (effectiveProfileId === null) return;

  const { sql, params } = buildUpsertStatement(userId, effectiveProfileId, input);
  await getDb().run(sql, params);
}

/**
 * Saves several entries in one round trip. Used when merging a guest's local history into an account.
 */
export async function addHistoryEntries(
  userId: number,
  profileId: number | undefined,
  inputs: HistoryInput[]
): Promise<void> {
  if (inputs.length === 0) return;

  const effectiveProfileId = profileId ?? (await findDefaultProfileId(userId));
  if (effectiveProfileId === null) return;

  await getDb().batch(inputs.map((input) => buildUpsertStatement(userId, effectiveProfileId, input)));
}

export async function removeFromHistory(userId: number, profileId: number | undefined, historyId: number): Promise<void> {
  const effectiveProfileId = profileId ?? (await findDefaultProfileId(userId));
  if (effectiveProfileId === null) return;

  await getDb().run("DELETE FROM watch_history WHERE user_id = ? AND profile_id = ? AND id = ?", [
    userId,
    effectiveProfileId,
    historyId,
  ]);
}

export async function clearHistory(userId: number, profileId?: number): Promise<void> {
  const effectiveProfileId = profileId ?? (await findDefaultProfileId(userId));
  if (effectiveProfileId === null) return;

  await getDb().run("DELETE FROM watch_history WHERE user_id = ? AND profile_id = ?", [
    userId,
    effectiveProfileId,
  ]);
}

export async function listHistory(userId: number, profileId?: number, limit = 50): Promise<HistoryEntry[]> {
  const effectiveProfileId = profileId ?? (await findDefaultProfileId(userId));
  if (effectiveProfileId === null) return [];

  const rows = await getDb().all<HistoryRow>(
    `SELECT * FROM watch_history WHERE user_id = ? AND profile_id = ? ORDER BY watched_at DESC LIMIT ?`,
    [userId, effectiveProfileId, limit]
  );

  return rows.map((row) => ({
    id: row.id,
    mediaType: row.media_type,
    mediaId: row.media_id,
    title: row.title,
    posterPath: row.poster_path,
    backdropPath: row.backdrop_path,
    titleBackdropPath: row.title_backdrop_path,
    seasonNumber: row.season_number,
    episodeNumber: row.episode_number,
    duration: row.duration,
    progress: row.progress,
    progressSeconds: row.progress_seconds,
    watchedAt: row.watched_at,
  }));
}
