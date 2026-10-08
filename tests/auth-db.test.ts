import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "@/lib/db/connection";
import { createUser, findUserByEmail, findUserByIdentifier } from "@/lib/db/users";
import { createSession, findValidSessionByToken, deleteSession } from "@/lib/db/sessions";
import { createProfile, listProfiles, findDefaultProfileId } from "@/lib/db/profiles";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_TTL_MS } from "@/lib/auth/session";

describe("Real DB Integration: Lifecycle, Password Verification, and Constraints", () => {
  beforeAll(async () => {
    // Truncate/reset tables for fresh execution on real SQLite
    const db = getDb();
    await db.run("DELETE FROM sessions");
    await db.run("DELETE FROM profiles");
    await db.run("DELETE FROM users");
  });

  describe("User Creation & Password Hashing", () => {
    it("hashes password with bcrypt and validates against correct password only", async () => {
      const password = "SuperSecretPassword123!";
      const hash = await hashPassword(password);

      expect(await verifyPassword(password, hash)).toBe(true);
      expect(await verifyPassword("WrongPassword!", hash)).toBe(false);
      expect(await verifyPassword("", hash)).toBe(false);
    });

    it("inserts user into real database and retrieves by email and identifier", async () => {
      const email = "alice@example.com";
      const hash = await hashPassword("ValidPassword123!");
      const user = await createUser(email, hash, "Alice");

      expect(user.id).toBeGreaterThan(0);
      expect(user.email).toBe(email);
      expect(user.display_name).toBe("Alice");

      const fetchedByEmail = await findUserByEmail(email);
      expect(fetchedByEmail?.id).toBe(user.id);

      const fetchedByIdentifier = await findUserByIdentifier("alice");
      expect(fetchedByIdentifier?.id).toBe(user.id);
    });

    it("enforces database uniqueness constraint on duplicate email insertion", async () => {
      const email = "bob@example.com";
      const hash = await hashPassword("ValidPassword123!");
      await createUser(email, hash, "Bob");

      await expect(createUser(email, hash, "Bob Duplicate")).rejects.toThrow();
    });
  });

  describe("Session Storage, Expiration & Revocation", () => {
    it("creates active session and validates against expiration timestamp", async () => {
      const user = await createUser("charlie@example.com", "dummyhash", "Charlie");
      const token = createSessionToken();
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

      await createSession(user.id, token, expiresAt, "Mozilla/5.0 Test");

      const session = await findValidSessionByToken(token);
      expect(session).not.toBeNull();
      expect(session?.user_id).toBe(user.id);
      expect(session?.email).toBe(user.email);
    });

    it("rejects expired sessions in database query", async () => {
      const user = await createUser("expired@example.com", "dummyhash", "ExpiredUser");
      const token = createSessionToken();
      // Set expiration in the past
      const pastExpiresAt = new Date(Date.now() - 5000).toISOString();

      await createSession(user.id, token, pastExpiresAt, "TestAgent");

      const session = await findValidSessionByToken(token);
      expect(session).toBeNull();
    });

    it("revokes session on deletion and returns 401 equivalent", async () => {
      const user = await createUser("revoked@example.com", "dummyhash", "RevokedUser");
      const token = createSessionToken();
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

      await createSession(user.id, token, expiresAt, "TestAgent");
      expect(await findValidSessionByToken(token)).not.toBeNull();

      await deleteSession(token);
      expect(await findValidSessionByToken(token)).toBeNull();
    });
  });

  describe("Profile Creation & Max 5 Limit Invariant", () => {
    it("allows up to 5 profiles and strictly enforces 5-profile cap at database layer", async () => {
      const user = await createUser("maxprofiles@example.com", "dummyhash", "MaxProfilesUser");

      // Create 5 profiles
      for (let i = 1; i <= 5; i++) {
        const profile = await createProfile(user.id, {
          name: `Profile ${i}`,
          avatarUrl: `/avatar/classic-${i}.png`,
        });
        expect(profile.id).toBeGreaterThan(0);
      }

      const profiles = await listProfiles(user.id);
      expect(profiles).toHaveLength(5);

      // Attempt 6th profile creation -> must reject
      await expect(
        createProfile(user.id, {
          name: "Profile 6",
          avatarUrl: "/avatar/classic-1.png",
        })
      ).rejects.toThrow("Maximum of 5 profiles per account reached");
    });
  });
});
