import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/connection";
import { createUser } from "@/lib/db/users";
import {
  ACTIVITY_UPDATE_THRESHOLD_MS,
  createSession,
  touchSessionActivity,
} from "@/lib/db/sessions";

async function readLastActive(token: string): Promise<string | null> {
  const row = await getDb().get<{ last_active_at: string | null }>(
    "SELECT last_active_at FROM sessions WHERE token = ?",
    [token]
  );
  return row?.last_active_at ?? null;
}

describe("touchSessionActivity", () => {
  const token = "session-activity-token";
  let userId = 0;

  beforeAll(async () => {
    const db = getDb();
    await db.run("DELETE FROM sessions");
    await db.run("DELETE FROM profiles");
    await db.run("DELETE FROM users");

    const user = await createUser("activity@example.test", "hash", "Activity");
    userId = user.id;
    await createSession(userId, token, new Date(Date.now() + 86_400_000).toISOString());
  });

  it("does not write when the session was active within the threshold", async () => {
    const recent = new Date(Date.now() - ACTIVITY_UPDATE_THRESHOLD_MS / 2).toISOString();
    await getDb().run("UPDATE sessions SET last_active_at = ? WHERE token = ?", [recent, token]);

    await touchSessionActivity(token, recent);

    expect(await readLastActive(token)).toBe(recent);
  });

  it("writes once the threshold has passed", async () => {
    const stale = new Date(Date.now() - ACTIVITY_UPDATE_THRESHOLD_MS - 1000).toISOString();
    await getDb().run("UPDATE sessions SET last_active_at = ? WHERE token = ?", [stale, token]);

    await touchSessionActivity(token, stale);

    expect(await readLastActive(token)).not.toBe(stale);
  });

  it("only touches a session about once an hour", () => {
    expect(ACTIVITY_UPDATE_THRESHOLD_MS).toBe(60 * 60 * 1000);
  });
});
