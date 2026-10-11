import { describe, it, expect, beforeAll } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "@/lib/db/connection";
import { createUser } from "@/lib/db/users";
import { hashPassword } from "@/lib/auth/password";
import { findValidSessionByToken } from "@/lib/db/sessions";
import { createProfile } from "@/lib/db/profiles";
import loginHandler from "@/pages/api/auth/login";

interface LoginResponsePayload {
  user?: {
    email?: string;
    hasProfiles?: boolean;
    [key: string]: unknown;
  };
  redirectTo?: string;
  error?: string;
  [key: string]: unknown;
}

interface MockResponse {
  status: number;
  data: LoginResponsePayload | null;
  headers: Record<string, string>;
}

// Lightweight real HTTP mock wrapper without external network overhead
function createMockHttp(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  let statusCode = 200;
  let responseData: LoginResponsePayload | null = null;
  const responseHeaders: Record<string, string> = {};

  const req = {
    method: "POST",
    body,
    headers: {
      "user-agent": "Mozilla/5.0 Test Suite Agent",
      "x-forwarded-for": "127.0.0.1",
      ...headers,
    },
  } as unknown as NextApiRequest;

  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: unknown) {
      responseData = data as LoginResponsePayload | null;
      return res;
    },
    setHeader(name: string, value: string) {
      responseHeaders[name.toLowerCase()] = value;
      return res;
    },
  } as unknown as NextApiResponse;

  return {
    req,
    res,
    getResponse: (): MockResponse => ({ status: statusCode, data: responseData, headers: responseHeaders }),
  };
}

describe("E2E API Route: Real Password Login & Session Generation", () => {
  const testEmail = "realuser@cineby.app";
  const testPlainPassword = "MyVerySecurePassword2026!";

  beforeAll(async () => {
    const db = getDb();
    await db.run("DELETE FROM sessions");
    await db.run("DELETE FROM profiles");
    await db.run("DELETE FROM users");

    // Create a real user with a real bcrypt password hash in the database
    const passwordHash = await hashPassword(testPlainPassword);
    const user = await createUser(testEmail, passwordHash, "RealUser");

    // Add a profile so existing profile detection works
    await createProfile(user.id, {
      name: "Main Profile",
      avatarUrl: "/avatar/classic-1.png",
    });
  });

  it("authenticates successfully with REAL email and plaintext password through /api/auth/login", async () => {
    const { req, res, getResponse } = createMockHttp({
      identifier: testEmail,
      password: testPlainPassword,
    });

    await loginHandler(req, res);
    const response = getResponse();

    // 1. HTTP 200 OK
    expect(response.status).toBe(200);

    // 2. Returns expected user payload
    expect(response.data?.user?.email).toBe(testEmail);
    expect(response.data?.user?.hasProfiles).toBe(true);
    expect(response.data?.redirectTo).toBe("/profiles");

    // 3. Produces a real Set-Cookie header with the session token
    const setCookie = response.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain("cineby_session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");

    // Extract raw token from cookie
    const tokenMatch = setCookie.match(/cineby_session=([0-9a-f]{64})/);
    expect(tokenMatch).not.toBeNull();
    const sessionToken = tokenMatch![1];

    // 4. Verify that this session was ACTUALLY created in the database and is valid!
    const sessionInDb = await findValidSessionByToken(sessionToken);
    expect(sessionInDb).not.toBeNull();
    expect(sessionInDb?.email).toBe(testEmail);
  });

  it("rejects login when password does not match real bcrypt hash", async () => {
    const { req, res, getResponse } = createMockHttp({
      identifier: testEmail,
      password: "WrongPasswordAttempt!",
    });

    await loginHandler(req, res);
    const response = getResponse();

    expect(response.status).toBe(401);
    expect(response.data?.error).toBe("Invalid username/email or password.");
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("rejects login for non-existent users", async () => {
    const { req, res, getResponse } = createMockHttp({
      identifier: "nonexistent@cineby.app",
      password: testPlainPassword,
    });

    await loginHandler(req, res);
    const response = getResponse();

    expect(response.status).toBe(401);
    expect(response.data?.error).toBe("Invalid username/email or password.");
  });
});
