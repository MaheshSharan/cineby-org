import { getDb } from "@/lib/db/connection";

const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 10;

export async function allowAuthAttempt(key: string): Promise<boolean> {
  const now = Date.now();
  const db = getDb();
  const row = await db.get<{ attempts: number; reset_at: number }>(
    "SELECT attempts, reset_at FROM auth_rate_limits WHERE key = ?",
    [key]
  );
  if (!row || row.reset_at <= now) {
    await db.run(
      "INSERT INTO auth_rate_limits (key, attempts, reset_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = 1, reset_at = excluded.reset_at",
      [key, now + WINDOW_MS]
    );
    return true;
  }
  if (row.attempts >= MAX_ATTEMPTS) return false;
  await db.run("UPDATE auth_rate_limits SET attempts = attempts + 1 WHERE key = ?", [key]);
  return true;
}

export function authClientKey(req: { headers: { [key: string]: string | string[] | undefined } }, identifier: string): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim();
  return `${ip || "unknown"}:${identifier.trim().toLowerCase()}`;
}
