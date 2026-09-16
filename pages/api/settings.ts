import type { NextApiRequest, NextApiResponse } from "next";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getUserSettingsFromDb, upsertUserSettingsInDb } from "@/lib/db/settings";
import { DEFAULT_SETTINGS, normalizeApiSettings, toApiSettingsResponse } from "@/lib/settings/types";
import { withApiContext } from "@/lib/validation";

export default withApiContext("api/settings", async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getCurrentUser(req);

  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.method === "GET") {
    const saved = await getUserSettingsFromDb(user.id);
    const active = saved ?? DEFAULT_SETTINGS;
    res.status(200).json(toApiSettingsResponse(active));
    return;
  }

  if (req.method === "POST" || req.method === "PUT") {
    const rawBody = (req.body ?? {}) as unknown;
    const normalized = normalizeApiSettings(rawBody);

    await upsertUserSettingsInDb(user.id, normalized);
    res.status(200).json({
      success: true,
      ...toApiSettingsResponse(normalized),
    });
    return;
  }

  res.setHeader("Allow", "GET, POST, PUT");
  res.status(405).json({ error: "Method not allowed" });
});
