import { getDb } from "@/lib/db/connection";

const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 10;
const UNKNOWN_CLIENT = "unknown";

type HeaderValue = string | string[] | undefined;

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

function firstHeaderEntry(value: HeaderValue): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.split(",")[0]?.trim() || undefined;
}

/**
 * Cloudflare Workers never receive x-forwarded-for, so every client used to share the "unknown" key.
 * cf-connecting-ip is set by Cloudflare itself and cannot be spoofed by the client; x-forwarded-for
 * covers the self-hosted deployment behind a reverse proxy.
 */
export function authClientKey(req: { headers: Record<string, HeaderValue> }, identifier: string): string {
  const ip = firstHeaderEntry(req.headers["cf-connecting-ip"]) ?? firstHeaderEntry(req.headers["x-forwarded-for"]);
  return `${ip ?? UNKNOWN_CLIENT}:${identifier.trim().toLowerCase()}`;
}
