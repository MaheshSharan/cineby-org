import { describe, it, expect, beforeAll } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "@/lib/db/connection";
import { createUser } from "@/lib/db/users";
import { createProfile } from "@/lib/db/profiles";
import { addHistoryEntries, addHistoryEntry, listHistory } from "@/lib/db/history";
import { parseHistoryBatch, MAX_HISTORY_BATCH_ITEMS } from "@/lib/validation/history";
import batchHandler from "@/pages/api/history/batch";

const baseEntry = {
  mediaType: "movie" as const,
  mediaId: 500,
  title: "Base Movie",
  progress: 10,
  progressSeconds: 600,
};

describe("watch history persistence", () => {
  let userId = 0;
  let profileId = 0;

  beforeAll(async () => {
    const db = getDb();
    await db.run("DELETE FROM watch_history");
    await db.run("DELETE FROM sessions");
    await db.run("DELETE FROM profiles");
    await db.run("DELETE FROM users");

    const user = await createUser("history-user@example.test", "hash", "HistoryUser");
    userId = user.id;
    const profile = await createProfile(userId, { name: "Main", avatarUrl: "/avatars/1.png" });
    profileId = profile.id;
  });

  it("keeps one row per title and updates it when progress changes", async () => {
    await addHistoryEntry(userId, profileId, baseEntry);
    await addHistoryEntry(userId, profileId, { ...baseEntry, progress: 20, progressSeconds: 1200 });

    const rows = await listHistory(userId, profileId);
    const matches = rows.filter((row) => row.mediaId === baseEntry.mediaId);

    expect(matches).toHaveLength(1);
    expect(matches[0].progressSeconds).toBe(1200);
  });

  it("writes nothing when the playback position has not changed", async () => {
    await addHistoryEntry(userId, profileId, { ...baseEntry, progress: 20, progressSeconds: 1200 });
    const [before] = await listHistory(userId, profileId);

    await new Promise((resolve) => setTimeout(resolve, 5));
    await addHistoryEntry(userId, profileId, { ...baseEntry, progress: 20, progressSeconds: 1200 });
    const [after] = await listHistory(userId, profileId);

    expect(after.watchedAt).toBe(before.watchedAt);
  });

  it("updates the row when the episode changes at the same position", async () => {
    const tvEntry = { mediaType: "tv" as const, mediaId: 900, title: "Show", progress: 5, progressSeconds: 100 };
    await addHistoryEntry(userId, profileId, { ...tvEntry, seasonNumber: 1, episodeNumber: 1 });
    await addHistoryEntry(userId, profileId, { ...tvEntry, seasonNumber: 1, episodeNumber: 2 });

    const rows = await listHistory(userId, profileId);
    const show = rows.find((row) => row.mediaId === 900);

    expect(show?.episodeNumber).toBe(2);
  });

  it("saves several entries in one call", async () => {
    await addHistoryEntries(userId, profileId, [
      { ...baseEntry, mediaId: 701, title: "Batch One" },
      { ...baseEntry, mediaId: 702, title: "Batch Two" },
    ]);

    const rows = await listHistory(userId, profileId);

    expect(rows.some((row) => row.mediaId === 701)).toBe(true);
    expect(rows.some((row) => row.mediaId === 702)).toBe(true);
  });

  it("rolls back the whole batch when one statement fails", async () => {
    const db = getDb();
    await expect(
      db.batch([
        { sql: "INSERT INTO watch_history (user_id, profile_id, media_type, media_id, title, watched_at) VALUES (?, ?, 'movie', 801, 'Rollback One', 'now')", params: [userId, profileId] },
        { sql: "INSERT INTO watch_history (user_id, profile_id, media_type, media_id, title, watched_at) VALUES (?, ?, 'movie', 802, NULL, 'now')", params: [userId, profileId] },
      ])
    ).rejects.toThrow();

    const rows = await listHistory(userId, profileId);
    expect(rows.some((row) => row.mediaId === 801)).toBe(false);
  });
});

describe("parseHistoryBatch", () => {
  it("rejects bodies without a usable items array", () => {
    expect(parseHistoryBatch(null)).toBeNull();
    expect(parseHistoryBatch({})).toBeNull();
    expect(parseHistoryBatch({ items: [] })).toBeNull();
    expect(parseHistoryBatch({ items: "nope" })).toBeNull();
  });

  it("rejects batches above the size limit", () => {
    const items = Array.from({ length: MAX_HISTORY_BATCH_ITEMS + 1 }, (_, index) => ({
      ...baseEntry,
      mediaId: index + 1,
    }));

    expect(parseHistoryBatch({ items })).toBeNull();
  });

  it("skips invalid entries and keeps the first entry per title", () => {
    const result = parseHistoryBatch({
      items: [
        { ...baseEntry, mediaId: 1, progressSeconds: 300 },
        { ...baseEntry, mediaId: 1, progressSeconds: 100 },
        { ...baseEntry, mediaId: 2, title: "" },
        { ...baseEntry, mediaId: 3 },
      ],
    });

    expect(result?.items.map((item) => item.mediaId)).toEqual([1, 3]);
    expect(result?.items[0].progressSeconds).toBe(300);
    expect(result?.skipped).toBe(2);
  });
});

describe("POST /api/history/batch", () => {
  function callBatch(method: string, body: unknown) {
    let statusCode = 200;
    let payload: unknown = null;

    const req = { method, body, headers: {}, cookies: {} } as unknown as NextApiRequest;
    const res = {
      status(code: number) {
        statusCode = code;
        return res;
      },
      json(data: unknown) {
        payload = data;
        return res;
      },
      setHeader() {
        return res;
      },
    } as unknown as NextApiResponse;

    return batchHandler(req, res).then(() => ({ status: statusCode, payload }));
  }

  it("rejects anything but POST", async () => {
    expect((await callBatch("GET", {})).status).toBe(405);
  });

  it("requires an authenticated session", async () => {
    expect((await callBatch("POST", { items: [baseEntry] })).status).toBe(401);
  });
});
