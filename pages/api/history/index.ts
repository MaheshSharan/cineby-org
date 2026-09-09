import type { NextApiRequest, NextApiResponse } from "next";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { addHistoryEntry, clearHistory, listHistory, removeFromHistory } from "@/lib/db/history";
import { withApiContext, validate, sendValidationError } from "@/lib/validation";
import { addHistorySchema } from "@/lib/validation/history";

export default withApiContext("api/history", async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getCurrentUser(req);

  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.method === "GET") {
    res.status(200).json({ items: await listHistory(user.id, user.activeProfileId ?? undefined) });
    return;
  }

  if (req.method === "DELETE") {
    const id = req.query.id ? Number(req.query.id) : null;
    if (id && Number.isInteger(id) && id > 0) {
      await removeFromHistory(user.id, user.activeProfileId ?? undefined, id);
    } else {
      await clearHistory(user.id, user.activeProfileId ?? undefined);
    }
    res.status(200).json({ success: true });
    return;
  }

  if (req.method === "POST") {
    const validation = validate(addHistorySchema, req.body ?? {});
    if (!validation.success || !validation.data) {
      sendValidationError(res, validation.errors ?? "Invalid history data");
      return;
    }

    const {
      mediaType,
      mediaId,
      title,
      posterPath,
      backdropPath,
      seasonNumber,
      episodeNumber,
      duration,
      progress,
      progressSeconds,
    } = validation.data;

    await addHistoryEntry(user.id, user.activeProfileId ?? undefined, {
      mediaType,
      mediaId,
      title,
      posterPath: posterPath ?? null,
      backdropPath: backdropPath ?? null,
      seasonNumber: seasonNumber ?? null,
      episodeNumber: episodeNumber ?? null,
      duration: duration ?? null,
      progress: progress ?? null,
      progressSeconds: progressSeconds ?? null,
    });

    res.status(201).json({ ok: true });
    return;
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  res.status(405).json({ error: "Method not allowed" });
});

