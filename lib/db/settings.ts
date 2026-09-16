import { getDb } from "./connection";
import { type CinebySettings, normalizeApiSettings } from "@/lib/settings/types";

export interface UserSettingsRow {
  user_id: number;
  settings_json: string;
  updated_at: string;
}

/**
 * Retrieve user settings from database by user ID.
 * Returns null if no settings row exists yet.
 */
export async function getUserSettingsFromDb(userId: number): Promise<CinebySettings | null> {
  const row = await getDb().get<UserSettingsRow>(
    "SELECT user_id, settings_json, updated_at FROM user_settings WHERE user_id = ?",
    [userId]
  );

  if (!row || !row.settings_json) {
    return null;
  }

  try {
    const parsed = JSON.parse(row.settings_json) as unknown;
    return normalizeApiSettings(parsed);
  } catch {
    return null;
  }
}

/**
 * Upsert user settings into database for a given user ID.
 */
export async function upsertUserSettingsInDb(userId: number, settings: CinebySettings): Promise<void> {
  const json = JSON.stringify(settings);
  const now = new Date().toISOString();

  await getDb().run(
    `INSERT INTO user_settings (user_id, settings_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       settings_json = excluded.settings_json,
       updated_at = excluded.updated_at`,
    [userId, json, now]
  );
}
