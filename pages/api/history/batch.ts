import type { NextApiRequest, NextApiResponse } from "next";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { addHistoryEntries } from "@/lib/db/history";
import { sendValidationError, withApiContext } from "@/lib/validation";
import { parseHistoryBatch } from "@/lib/validation/history";

export default withApiContext("api/history/batch", async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const user = await getCurrentUser(req);

  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const batch = parseHistoryBatch(req.body);

  if (!batch) {
    sendValidationError(res, "Invalid history batch");
    return;
  }

  await addHistoryEntries(user.id, user.activeProfileId ?? undefined, batch.items);

  res.status(201).json({ ok: true, saved: batch.items.length, skipped: batch.skipped });
});
