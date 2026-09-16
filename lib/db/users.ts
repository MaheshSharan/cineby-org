import { getDb } from "./connection";
import type { User } from "./types";

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

const SELECT_USER_COLUMNS = "id, email, password_hash, display_name, avatar_url, created_at";

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return getDb().get<UserRow>(
    `SELECT ${SELECT_USER_COLUMNS} FROM users WHERE LOWER(email) = LOWER(?)`,
    [email.trim()]
  );
}

export async function findUserByIdentifier(identifier: string): Promise<UserRow | null> {
  const trimmed = identifier.trim();
  return getDb().get<UserRow>(
    `SELECT ${SELECT_USER_COLUMNS} FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(display_name) = LOWER(?)`,
    [trimmed, trimmed]
  );
}

export async function findUserById(id: number): Promise<UserRow | null> {
  return getDb().get<UserRow>(
    `SELECT ${SELECT_USER_COLUMNS} FROM users WHERE id = ?`,
    [id]
  );
}

export async function createUser(
  email: string,
  passwordHash: string,
  displayName: string | null,
  avatarUrl: string | null = null
): Promise<UserRow> {
  const result = await getDb().run(
    "INSERT INTO users (email, password_hash, display_name, avatar_url, created_at) VALUES (?, ?, ?, ?, ?)",
    [email.trim().toLowerCase(), passwordHash, displayName, avatarUrl, new Date().toISOString()]
  );

  const user = await findUserById(Number(result.lastInsertRowid));

  if (!user) {
    throw new Error("Failed to create user");
  }

  return user;
}

export async function updateUserPassword(userId: number, passwordHash: string): Promise<void> {
  await getDb().run("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
}

export async function updateUserAvatar(userId: number, avatarUrl: string | null): Promise<void> {
  await getDb().run("UPDATE users SET avatar_url = ? WHERE id = ?", [avatarUrl, userId]);
}

export async function updateUserDisplayName(userId: number, displayName: string): Promise<void> {
  await getDb().run("UPDATE users SET display_name = ? WHERE id = ?", [displayName.trim(), userId]);
}

export async function deleteUser(userId: number): Promise<void> {
  const db = getDb();
  // Delete related records explicitly to guarantee cleanup across both D1 and SQLite
  await db.run("DELETE FROM watch_history WHERE user_id = ?", [userId]);
  await db.run("DELETE FROM watchlist WHERE user_id = ?", [userId]);
  await db.run("DELETE FROM profiles WHERE user_id = ?", [userId]);
  await db.run("DELETE FROM sessions WHERE user_id = ?", [userId]);
  await db.run("DELETE FROM users WHERE id = ?", [userId]);
}

export function toPublicUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? null,
    createdAt: row.created_at,
  };
}