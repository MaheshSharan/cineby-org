import { getDb } from "./connection";
import { hashPassword } from "@/lib/auth/password";
import { setActiveProfile } from "./sessions";

export interface ProfileRow {
  id: number;
  user_id: number;
  name: string;
  avatar_url: string;
  pin_hash: string | null;
  movie_genres: string;
  tv_genres: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileInput {
  name: string;
  avatarUrl: string;
  pinHash?: string | null;
  pin?: string | null;
  movieGenres?: string[];
  tvGenres?: string[];
  sessionToken?: string | null;
  autoSelect?: boolean;
}

const SELECT_COLUMNS = "id, user_id, name, avatar_url, pin_hash, movie_genres, tv_genres, created_at, updated_at";

export function parseProfileGenres(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
  } catch {
    return [];
  }
}

export async function listProfiles(userId: number): Promise<ProfileRow[]> {
  return getDb().all<ProfileRow>(
    `SELECT ${SELECT_COLUMNS} FROM profiles WHERE user_id = ? ORDER BY id`,
    [userId]
  );
}

export async function findDefaultProfileId(userId: number): Promise<number | null> {
  if (!userId || userId <= 0) return null;
  const row = await getDb().get<{ id: number }>(
    "SELECT id FROM profiles WHERE user_id = ? ORDER BY id ASC LIMIT 1",
    [userId]
  );
  return row?.id ?? null;
}

export async function ensureDefaultProfile(userId: number, name: string): Promise<void> {
  const defaultProfileId = await findDefaultProfileId(userId);
  if (defaultProfileId !== null) return;
  await createProfile(userId, {
    name: name || "Main profile",
    avatarUrl: "/avatar/classic-1.png",
  });
}

export async function findProfile(userId: number, profileId: number): Promise<ProfileRow | null> {
  return getDb().get<ProfileRow>(
    `SELECT ${SELECT_COLUMNS} FROM profiles WHERE user_id = ? AND id = ?`,
    [userId, profileId]
  );
}

export async function createProfile(userId: number, input: ProfileInput): Promise<ProfileRow> {
  let pinHash = input.pinHash ?? null;
  if (input.pin && !pinHash) {
    pinHash = await hashPassword(input.pin);
  }

  const now = new Date().toISOString();
  const result = await getDb().run(
    "INSERT INTO profiles (user_id, name, avatar_url, pin_hash, movie_genres, tv_genres, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      userId,
      input.name,
      input.avatarUrl,
      pinHash,
      JSON.stringify(input.movieGenres ?? []),
      JSON.stringify(input.tvGenres ?? []),
      now,
      now,
    ]
  );
  const profile = await findProfile(userId, Number(result.lastInsertRowid));
  if (!profile) throw new Error("Failed to create profile");

  if (input.autoSelect && input.sessionToken) {
    await setActiveProfile(input.sessionToken, profile.id);
  }

  return profile;
}

export async function updateProfile(userId: number, profileId: number, input: Partial<ProfileInput>): Promise<ProfileRow | null> {
  const current = await findProfile(userId, profileId);
  if (!current) return null;

  let pinHash = current.pin_hash;
  if (input.pinHash !== undefined) {
    pinHash = input.pinHash;
  } else if (input.pin !== undefined) {
    pinHash = input.pin ? await hashPassword(input.pin) : null;
  }

  const name = input.name ?? current.name;
  const avatarUrl = input.avatarUrl ?? current.avatar_url;
  const movieGenres = input.movieGenres !== undefined ? input.movieGenres : parseProfileGenres(current.movie_genres);
  const tvGenres = input.tvGenres !== undefined ? input.tvGenres : parseProfileGenres(current.tv_genres);

  await getDb().run(
    "UPDATE profiles SET name = ?, avatar_url = ?, pin_hash = ?, movie_genres = ?, tv_genres = ?, updated_at = ? WHERE user_id = ? AND id = ?",
    [
      name,
      avatarUrl,
      pinHash,
      JSON.stringify(movieGenres),
      JSON.stringify(tvGenres),
      new Date().toISOString(),
      userId,
      profileId,
    ]
  );
  return findProfile(userId, profileId);
}

export async function deleteProfile(userId: number, profileId: number): Promise<void> {
  await getDb().run("DELETE FROM profiles WHERE user_id = ? AND id = ?", [userId, profileId]);
}
