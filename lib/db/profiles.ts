import { getDb } from "./connection";

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
  movieGenres?: string[];
  tvGenres?: string[];
}

const SELECT_COLUMNS = "id, user_id, name, avatar_url, pin_hash, movie_genres, tv_genres, created_at, updated_at";

export async function listProfiles(userId: number): Promise<ProfileRow[]> {
  return getDb().all<ProfileRow>(
    `SELECT ${SELECT_COLUMNS} FROM profiles WHERE user_id = ? ORDER BY id`,
    [userId]
  );
}

export async function findDefaultProfileId(userId: number): Promise<number | null> {
  const profiles = await listProfiles(userId);
  return profiles[0]?.id ?? null;
}

export async function ensureDefaultProfile(userId: number, name: string): Promise<void> {
  const existing = await listProfiles(userId);
  if (existing.length > 0) return;
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
  const now = new Date().toISOString();
  const result = await getDb().run(
    "INSERT INTO profiles (user_id, name, avatar_url, pin_hash, movie_genres, tv_genres, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      userId,
      input.name,
      input.avatarUrl,
      input.pinHash ?? null,
      JSON.stringify(input.movieGenres ?? []),
      JSON.stringify(input.tvGenres ?? []),
      now,
      now,
    ]
  );
  const profile = await findProfile(userId, Number(result.lastInsertRowid));
  if (!profile) throw new Error("Failed to create profile");
  return profile;
}

export async function updateProfile(userId: number, profileId: number, input: ProfileInput): Promise<ProfileRow | null> {
  await getDb().run(
    "UPDATE profiles SET name = ?, avatar_url = ?, pin_hash = ?, movie_genres = ?, tv_genres = ?, updated_at = ? WHERE user_id = ? AND id = ?",
    [
      input.name,
      input.avatarUrl,
      input.pinHash ?? null,
      JSON.stringify(input.movieGenres ?? []),
      JSON.stringify(input.tvGenres ?? []),
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
