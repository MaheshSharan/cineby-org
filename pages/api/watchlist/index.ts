import type { NextApiRequest, NextApiResponse } from "next";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { addToWatchlist, clearWatchlist, listWatchlist } from "@/lib/db/watchlist";
import { withApiContext, validate, sendValidationError } from "@/lib/validation";
import { addToWatchlistSchema } from "@/lib/validation/watchlist";

export default withApiContext("api/watchlist", async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getCurrentUser(req);

  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.method === "GET") {
    res.status(200).json({ items: await listWatchlist(user.id, user.activeProfileId ?? undefined) });
    return;
  }

  if (req.method === "DELETE") {
    await clearWatchlist(user.id, user.activeProfileId ?? undefined);
    res.status(200).json({ success: true });
    return;
  }

  if (req.method === "POST") {
    const validation = validate(addToWatchlistSchema, req.body ?? {});
    if (!validation.success || !validation.data) {
      sendValidationError(res, validation.errors ?? "Invalid watchlist data");
      return;
    }

    const { mediaType, mediaId, title, posterPath, backdropPath } = validation.data;

    await addToWatchlist(
      user.id,
      { mediaType, mediaId, title, posterPath: posterPath ?? null, backdropPath: backdropPath ?? null },
      user.activeProfileId ?? undefined
    );
    res.status(201).json({ inWatchlist: true });
    return;
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  res.status(405).json({ error: "Method not allowed" });
});

