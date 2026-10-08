import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "@/lib/db/connection";
import { createUser } from "@/lib/db/users";
import { createProfile, listProfiles } from "@/lib/db/profiles";
import { addHistoryEntry, listHistory, removeFromHistory } from "@/lib/db/history";
import { addToWatchlist, listWatchlist, removeFromWatchlist } from "@/lib/db/watchlist";

describe("Security & Multi-Tenant Isolation: IDOR & Cross-Account Data Access", () => {
  let userAId: number;
  let userBId: number;
  let profileAId: number;
  let profileBId: number;

  beforeAll(async () => {
    const db = getDb();
    await db.run("DELETE FROM watch_history");
    await db.run("DELETE FROM watchlist");
    await db.run("DELETE FROM profiles");
    await db.run("DELETE FROM users");

    // Setup Account A with Profile A
    const userA = await createUser("accountA@example.com", "hashA", "User A");
    userAId = userA.id;
    const profileA = await createProfile(userAId, { name: "Profile A", avatarUrl: "/avatar/classic-1.png" });
    profileAId = profileA.id;

    // Setup Account B with Profile B
    const userB = await createUser("accountB@example.com", "hashB", "User B");
    userBId = userB.id;
    const profileB = await createProfile(userBId, { name: "Profile B", avatarUrl: "/avatar/classic-2.png" });
    profileBId = profileB.id;
  });

  describe("Profile Isolation & IDOR Protection", () => {
    it("never returns Account A's profiles when listing profiles for Account B", async () => {
      const listA = await listProfiles(userAId);
      const listB = await listProfiles(userBId);

      expect(listA.map((p) => p.id)).toContain(profileAId);
      expect(listA.map((p) => p.id)).not.toContain(profileBId);

      expect(listB.map((p) => p.id)).toContain(profileBId);
      expect(listB.map((p) => p.id)).not.toContain(profileAId);
    });
  });

  describe("Watch History Isolation", () => {
    it("ensures history entries written by Account A are strictly invisible to Account B", async () => {
      // Add watch progress for User A
      await addHistoryEntry(userAId, profileAId, {
        mediaType: "movie",
        mediaId: 101,
        title: "Inception",
        progress: 45,
        duration: "2h 28m",
        progressSeconds: 3600,
      });

      // User A sees it
      const historyA = await listHistory(userAId, profileAId);
      expect(historyA).toHaveLength(1);
      expect(historyA[0].title).toBe("Inception");

      // User B query for their own profile must be completely empty
      const historyB = await listHistory(userBId, profileBId);
      expect(historyB).toHaveLength(0);

      // Even if User B maliciously provides User A's profileId, the SQL WHERE user_id = ? isolates it
      const idorAttempt = await listHistory(userBId, profileAId);
      expect(idorAttempt).toHaveLength(0);
    });

    it("prevents Account B from deleting Account A's history items", async () => {
      const historyA = await listHistory(userAId, profileAId);
      const entryId = historyA[0].id;

      // User B attempts to delete User A's history record
      await removeFromHistory(userBId, profileBId, entryId);

      // Verify User A's entry was not deleted
      const checkA = await listHistory(userAId, profileAId);
      expect(checkA).toHaveLength(1);
    });
  });

  describe("Watchlist Isolation", () => {
    it("prevents cross-account watchlist leakage or mutation", async () => {
      // User A adds title to watchlist
      await addToWatchlist(userAId, {
        mediaType: "tv",
        mediaId: 202,
        title: "Breaking Bad",
        posterPath: null,
        backdropPath: null,
      }, profileAId);

      // User A has 1 item
      const listA = await listWatchlist(userAId, profileAId);
      expect(listA).toHaveLength(1);
      expect(listA[0].title).toBe("Breaking Bad");

      // User B has 0 items
      const listB = await listWatchlist(userBId, profileBId);
      expect(listB).toHaveLength(0);

      // User B attempting to remove User A's watchlist item has zero effect
      await removeFromWatchlist(userBId, "tv", 202, profileAId);
      const verifyA = await listWatchlist(userAId, profileAId);
      expect(verifyA).toHaveLength(1);
    });
  });
});
