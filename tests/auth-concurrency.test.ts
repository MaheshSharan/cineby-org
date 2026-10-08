import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "@/lib/db/connection";
import { createUser } from "@/lib/db/users";
import { createProfile } from "@/lib/db/profiles";
import { hashPassword } from "@/lib/auth/password";

describe("Concurrency, Race Conditions & SQL Integrity", () => {
  beforeAll(async () => {
    const db = getDb();
    await db.run("DELETE FROM sessions");
    await db.run("DELETE FROM profiles");
    await db.run("DELETE FROM users");
  });

  describe("Registration Race Condition", () => {
    it("guarantees only 1 user account is created when identical registrations race simultaneously", async () => {
      const email = "concurrent-signup@example.com";
      const hash = await hashPassword("ValidPassword123!");

      // Fire 5 simultaneous duplicate user creations
      const results = await Promise.allSettled([
        createUser(email, hash, "Concurrent User"),
        createUser(email, hash, "Concurrent User"),
        createUser(email, hash, "Concurrent User"),
        createUser(email, hash, "Concurrent User"),
        createUser(email, hash, "Concurrent User"),
      ]);

      const succeeded = results.filter((r) => r.status === "fulfilled");
      const failed = results.filter((r) => r.status === "rejected");

      // Exactly one succeeds, all remaining race attempts are cleanly rejected
      expect(succeeded).toHaveLength(1);
      expect(failed).toHaveLength(4);

      // Verify database has exactly 1 row
      const rows = await getDb().all<{ id: number }>("SELECT id FROM users WHERE email = ?", [email]);
      expect(rows).toHaveLength(1);
    });
  });

  describe("Concurrent Profile Creation Cap Race", () => {
    it("strictly prevents exceeding the 5-profile cap even during concurrent burst requests", async () => {
      const user = await createUser("burst-profiles@example.com", "hash", "Burst User");

      // Attempt creating 10 profiles simultaneously on an empty account
      const results = await Promise.allSettled(
        Array.from({ length: 10 }).map((_, i) =>
          createProfile(user.id, {
            name: `Burst Profile ${i + 1}`,
            avatarUrl: `/avatar/classic-${(i % 5) + 1}.png`,
          })
        )
      );

      // Verify the database never exceeded 5 profiles
      const profileRows = await getDb().all<{ id: number }>("SELECT id FROM profiles WHERE user_id = ?", [user.id]);
      expect(profileRows.length).toBeLessThanOrEqual(5);
    });
  });
});
