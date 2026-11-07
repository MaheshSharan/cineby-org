import { beforeEach, describe, expect, it } from "vitest";

import { allowAuthAttempt, authClientKey } from "@/lib/auth/rateLimit";
import { getDb } from "@/lib/db/connection";

describe("authClientKey", () => {
  it("prefers the Cloudflare client IP over x-forwarded-for", () => {
    const key = authClientKey(
      { headers: { "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" } },
      " User@Example.com "
    );

    expect(key).toBe("203.0.113.7:user@example.com");
  });

  it("falls back to the first x-forwarded-for entry behind a reverse proxy", () => {
    const key = authClientKey({ headers: { "x-forwarded-for": "198.51.100.1, 10.0.0.2" } }, "alice");

    expect(key).toBe("198.51.100.1:alice");
  });

  it("uses 'unknown' only when no client IP header exists", () => {
    expect(authClientKey({ headers: {} }, "alice")).toBe("unknown:alice");
  });

  it("gives different clients different keys for the same identifier", () => {
    const first = authClientKey({ headers: { "cf-connecting-ip": "203.0.113.7" } }, "google-oauth");
    const second = authClientKey({ headers: { "cf-connecting-ip": "203.0.113.8" } }, "google-oauth");

    expect(first).not.toBe(second);
  });
});

describe("allowAuthAttempt", () => {
  beforeEach(async () => {
    await getDb().run("DELETE FROM auth_rate_limits");
  });

  it("blocks the 11th attempt from one client but not from another client", async () => {
    const blockedClient = authClientKey({ headers: { "cf-connecting-ip": "203.0.113.7" } }, "alice");
    const otherClient = authClientKey({ headers: { "cf-connecting-ip": "203.0.113.8" } }, "alice");

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(await allowAuthAttempt(blockedClient)).toBe(true);
    }

    expect(await allowAuthAttempt(blockedClient)).toBe(false);
    expect(await allowAuthAttempt(otherClient)).toBe(true);
  });
});
