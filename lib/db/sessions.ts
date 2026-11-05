import { getDb } from "./connection";

export interface SessionWithUser {
  id: number;
  token: string;
  user_id: number;
  active_profile_id: number | null;
  user_agent: string | null;
  last_active_at: string | null;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  user_created_at: string;
  created_at: string;
  expires_at: string;
  /** 1 when the user owns at least one profile, otherwise 0. */
  has_profiles: number;
}

export interface UserSessionRecord {
  id: number;
  userId: number;
  userAgent: string | null;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

interface SessionRow {
  id: number;
  token: string;
  user_id: number;
  active_profile_id: number | null;
  user_agent: string | null;
  last_active_at: string | null;
  created_at: string;
  expires_at: string;
}

// Throttle activity writes: each one costs a D1 row written, and the timestamp only feeds the
// "last active" label in the sessions list, so hourly precision is enough.
export const ACTIVITY_UPDATE_THRESHOLD_MS = 60 * 60 * 1000;

export async function createSession(
  userId: number,
  token: string,
  expiresAt: string,
  userAgent?: string | null
): Promise<void> {
  const now = new Date().toISOString();
  await getDb().run(
    "INSERT INTO sessions (token, user_id, user_agent, last_active_at, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    [token, userId, userAgent ?? null, now, now, expiresAt]
  );
}

export async function findValidSessionByToken(token: string): Promise<SessionWithUser | null> {
  return getDb().get<SessionWithUser>(
    `SELECT s.id, s.token, s.user_id, s.active_profile_id, s.user_agent, s.last_active_at, s.created_at, s.expires_at,
            u.email, u.display_name, u.avatar_url, u.created_at AS user_created_at,
            EXISTS(SELECT 1 FROM profiles p WHERE p.user_id = s.user_id) AS has_profiles
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
    [token, new Date().toISOString()]
  );
}

/**
 * Conditionally touch last_active_at if outside the activity threshold.
 * Avoids SQLite/D1 contention on rapid consecutive requests.
 */
export async function touchSessionActivity(token: string, lastActiveAt?: string | null): Promise<void> {
  const now = Date.now();
  if (lastActiveAt) {
    const prev = new Date(lastActiveAt).getTime();
    if (!Number.isNaN(prev) && now - prev < ACTIVITY_UPDATE_THRESHOLD_MS) {
      return;
    }
  }

  try {
    await getDb().run("UPDATE sessions SET last_active_at = ? WHERE token = ?", [
      new Date(now).toISOString(),
      token,
    ]);
  } catch {
    // Best-effort activity timestamp update
  }
}

export async function listUserSessions(userId: number, currentToken: string): Promise<UserSessionRecord[]> {
  const now = new Date().toISOString();
  const rows = await getDb().all<SessionRow>(
    `SELECT id, token, user_id, user_agent, last_active_at, created_at, expires_at
     FROM sessions
     WHERE user_id = ? AND expires_at > ?
     ORDER BY last_active_at DESC, created_at DESC`,
    [userId, now]
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    userAgent: row.user_agent ?? null,
    lastActiveAt: row.last_active_at ?? row.created_at,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    isCurrent: row.token === currentToken,
  }));
}

export async function deleteSession(token: string): Promise<void> {
  await getDb().run("DELETE FROM sessions WHERE token = ?", [token]);
}

export async function deleteSessionById(userId: number, sessionId: number): Promise<boolean> {
  const result = await getDb().run("DELETE FROM sessions WHERE id = ? AND user_id = ?", [
    sessionId,
    userId,
  ]);
  return Number(result.changes) > 0;
}

export async function deleteOtherUserSessions(userId: number, currentToken: string): Promise<void> {
  await getDb().run("DELETE FROM sessions WHERE user_id = ? AND token <> ?", [userId, currentToken]);
}

export async function setActiveProfile(token: string, profileId: number): Promise<void> {
  await getDb().run("UPDATE sessions SET active_profile_id = ? WHERE token = ?", [profileId, token]);
}
