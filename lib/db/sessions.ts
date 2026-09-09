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

// Throttle activity writes: only update last_active_at if at least 5 minutes elapsed
const ACTIVITY_UPDATE_THRESHOLD_MS = 5 * 60 * 1000;

export function createSession(
  userId: number,
  token: string,
  expiresAt: string,
  userAgent?: string | null
): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO sessions (token, user_id, user_agent, last_active_at, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(token, userId, userAgent ?? null, now, now, expiresAt);
}

export function findValidSessionByToken(token: string): SessionWithUser | null {
  const row = getDb()
    .prepare(
      `SELECT s.id, s.token, s.user_id, s.active_profile_id, s.user_agent, s.last_active_at, s.created_at, s.expires_at,
              u.email, u.display_name, u.avatar_url, u.created_at AS user_created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`
    )
    .get(token, new Date().toISOString()) as SessionWithUser | undefined;

  return row ?? null;
}

/**
 * Conditionally touch last_active_at if outside the activity threshold.
 * Avoids SQLite contention on rapid consecutive requests.
 */
export function touchSessionActivity(token: string, lastActiveAt?: string | null): void {
  const now = Date.now();
  if (lastActiveAt) {
    const prev = new Date(lastActiveAt).getTime();
    if (!Number.isNaN(prev) && now - prev < ACTIVITY_UPDATE_THRESHOLD_MS) {
      return;
    }
  }

  try {
    getDb()
      .prepare("UPDATE sessions SET last_active_at = ? WHERE token = ?")
      .run(new Date(now).toISOString(), token);
  } catch {
    // Best-effort activity timestamp update
  }
}

export function listUserSessions(userId: number, currentToken: string): UserSessionRecord[] {
  const now = new Date().toISOString();
  const rows = getDb()
    .prepare(
      `SELECT id, token, user_id, user_agent, last_active_at, created_at, expires_at
       FROM sessions
       WHERE user_id = ? AND expires_at > ?
       ORDER BY last_active_at DESC, created_at DESC`
    )
    .all(userId, now) as unknown as SessionRow[];

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

export function deleteSession(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function deleteSessionById(userId: number, sessionId: number): boolean {
  const result = getDb()
    .prepare("DELETE FROM sessions WHERE id = ? AND user_id = ?")
    .run(sessionId, userId);
  return Number(result.changes) > 0;
}

export function deleteOtherUserSessions(userId: number, currentToken: string): void {
  getDb()
    .prepare("DELETE FROM sessions WHERE user_id = ? AND token <> ?")
    .run(userId, currentToken);
}

export function setActiveProfile(token: string, profileId: number): void {
  getDb().prepare("UPDATE sessions SET active_profile_id = ? WHERE token = ?").run(profileId, token);
}

