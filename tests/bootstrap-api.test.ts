import { beforeAll, describe, expect, it } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { createProfile } from "@/lib/db/profiles";
import { createSession } from "@/lib/db/sessions";
import { createUser } from "@/lib/db/users";
import { upsertUserSettingsInDb } from "@/lib/db/settings";
import { DEFAULT_SETTINGS } from "@/lib/settings/types";
import bootstrapHandler from "@/pages/api/bootstrap";

interface BootstrapResult {
  status: number;
  headers: Record<string, string | string[]>;
  body: Record<string, unknown> | null;
}

function callBootstrap(method: string, token?: string): Promise<BootstrapResult> {
  let status = 200;
  let body: Record<string, unknown> | null = null;
  const headers: Record<string, string | string[]> = {};
  const cookies = token ? { [SESSION_COOKIE]: token } : {};

  const req = {
    method,
    headers: token ? { cookie: `${SESSION_COOKIE}=${token}` } : {},
    cookies,
  } as unknown as NextApiRequest;
  const res = {
    status(code: number) {
      status = code;
      return res;
    },
    json(data: unknown) {
      body = data as Record<string, unknown>;
      return res;
    },
    setHeader(name: string, value: string | string[]) {
      headers[name.toLowerCase()] = value;
      return res;
    },
  } as unknown as NextApiResponse;

  return bootstrapHandler(req, res).then(() => ({ status, headers, body }));
}

describe("GET /api/bootstrap", () => {
  const expiresAt = () => new Date(Date.now() + 86_400_000).toISOString();
  let userId = 0;

  beforeAll(async () => {
    const db = getDb();
    await db.run("DELETE FROM watch_history");
    await db.run("DELETE FROM user_settings");
    await db.run("DELETE FROM sessions");
    await db.run("DELETE FROM profiles");
    await db.run("DELETE FROM users");

    const user = await createUser("bootstrap@example.test", "hash", "Bootstrap");
    userId = user.id;
    await createProfile(userId, { name: "Main", avatarUrl: "/avatar/classic-1.png", pin: "1234" });
    await createSession(userId, "bootstrap-token", expiresAt());
  });

  it("only accepts GET", async () => {
    expect((await callBootstrap("POST", "bootstrap-token")).status).toBe(405);
  });

  it("rejects requests without a valid session and clears the cookies", async () => {
    const anonymous = await callBootstrap("GET");

    expect(anonymous.status).toBe(401);
    expect(anonymous.headers["set-cookie"]).toBeDefined();
    expect((await callBootstrap("GET", "unknown-token")).status).toBe(401);
  });

  it("returns user, profiles and settings together, and never caches them", async () => {
    const result = await callBootstrap("GET", "bootstrap-token");

    expect(result.status).toBe(200);
    expect(result.headers["cache-control"]).toBe("private, no-store");
    expect((result.body?.user as { email: string }).email).toBe("bootstrap@example.test");

    const profiles = result.body?.profiles as Array<Record<string, unknown>>;
    expect(profiles).toHaveLength(1);
    expect(profiles[0].hasPin).toBe(true);
    expect(profiles[0]).not.toHaveProperty("pin_hash");
    expect(result.body?.activeProfileId).toBe(profiles[0].id);
    expect(result.body?.settings).toBeDefined();
  });

  it("returns the saved settings", async () => {
    await upsertUserSettingsInDb(userId, {
      ...DEFAULT_SETTINGS,
      appearance: { ...DEFAULT_SETTINGS.appearance, theme: "emerald" },
    });

    const result = await callBootstrap("GET", "bootstrap-token");

    expect((result.body?.settings as { theme: string }).theme).toBe("emerald");
  });
});
