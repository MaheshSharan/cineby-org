import { beforeAll, describe, expect, it } from "vitest";
import type { NextApiRequest } from "next";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getDb } from "@/lib/db/connection";
import { createProfile } from "@/lib/db/profiles";
import { createSession, findValidSessionByToken } from "@/lib/db/sessions";
import { createUser } from "@/lib/db/users";
import { SESSION_COOKIE } from "@/lib/auth/session";

function requestWithSession(token: string): NextApiRequest {
  return { headers: { cookie: `${SESSION_COOKIE}=${token}` }, cookies: { [SESSION_COOKIE]: token } } as unknown as NextApiRequest;
}

describe("session lookup", () => {
  const expiresAt = () => new Date(Date.now() + 86_400_000).toISOString();

  beforeAll(async () => {
    const db = getDb();
    await db.run("DELETE FROM watch_history");
    await db.run("DELETE FROM sessions");
    await db.run("DELETE FROM profiles");
    await db.run("DELETE FROM users");
  });

  it("reports whether the user has a profile in the same query as the session", async () => {
    const user = await createUser("no-profile@example.test", "hash", "NoProfile");
    await createSession(user.id, "token-no-profile", expiresAt());

    const before = await findValidSessionByToken("token-no-profile");
    expect(before?.has_profiles).toBe(0);

    await createProfile(user.id, { name: "Main", avatarUrl: "/avatar/classic-1.png" });

    const after = await findValidSessionByToken("token-no-profile");
    expect(after?.has_profiles).toBe(1);
  });

  it("builds the current user from one session lookup", async () => {
    const user = await createUser("current@example.test", "hash", "Current");
    await createSession(user.id, "token-current", expiresAt());

    expect((await getCurrentUser(requestWithSession("token-current")))?.hasProfiles).toBe(false);

    await createProfile(user.id, { name: "Main", avatarUrl: "/avatar/classic-1.png" });

    const current = await getCurrentUser(requestWithSession("token-current"));
    expect(current?.hasProfiles).toBe(true);
    expect(current?.email).toBe("current@example.test");
  });

  it("returns nothing for an unknown session", async () => {
    expect(await getCurrentUser(requestWithSession("missing-token"))).toBeNull();
  });
});
