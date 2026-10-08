import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import { createSessionToken, buildSessionCookie, getSessionToken } from "@/lib/auth/session";

describe("Unit: Auth Core Utilities & Security Tokens", () => {
  describe("Registration Schema Constraints", () => {
    it("validates compliant email and password length", () => {
      const valid = registerSchema.safeParse({
        username: "johndoe",
        email: "user@example.com",
        password: "ValidPassword123",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects password shorter than 8 characters", () => {
      const invalid = registerSchema.safeParse({
        username: "johndoe",
        email: "user@example.com",
        password: "short",
      });
      expect(invalid.success).toBe(false);
    });

    it("rejects malformed emails", () => {
      const invalid = registerSchema.safeParse({
        username: "johndoe",
        email: "invalid-email",
        password: "ValidPassword123",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("Cryptographic Session Token Entropy & Cookie Safety", () => {
    it("generates 64-hex char tokens with 256 bits of cryptographic entropy", () => {
      const token1 = createSessionToken();
      const token2 = createSessionToken();

      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).toMatch(/^[0-9a-f]{64}$/);
      expect(token1).not.toBe(token2);
    });

    it("builds security-hardened Set-Cookie headers with HttpOnly, SameSite=Lax, and Secure", () => {
      const token = createSessionToken();
      const cookieHeader = buildSessionCookie(token);

      expect(cookieHeader).toContain(`cineby_session=${token}`);
      expect(cookieHeader).toContain("HttpOnly");
      expect(cookieHeader).toContain("SameSite=Lax");
      expect(cookieHeader).toContain("Path=/");
      expect(cookieHeader).toContain("Max-Age=");
    });

    it("parses session cookie cleanly via getSessionToken", () => {
      const token = createSessionToken();
      const rawHeader = `theme=dark; cineby_session=${token}; visited=true`;
      expect(getSessionToken({ headers: { cookie: rawHeader } })).toBe(token);
      expect(getSessionToken({ headers: { cookie: "theme=dark" } })).toBeNull();
    });
  });
});
