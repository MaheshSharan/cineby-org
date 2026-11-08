import type { NextApiRequest, NextApiResponse } from "next";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { clearAuthCookies } from "@/lib/auth/session";
import { listProfiles } from "@/lib/db/profiles";
import { getUserSettingsFromDb } from "@/lib/db/settings";
import { toPublicProfile } from "@/lib/profile/publicProfile";
import { DEFAULT_SETTINGS, toApiSettingsResponse } from "@/lib/settings/types";
import { withApiContext } from "@/lib/validation";
import { NO_STORE_CACHE_CONTROL } from "@/lib/cache/profiles";

/**
 * Everything the app needs to render a signed-in page, in one request: the user, their profiles
 * and their settings. Replaces separate calls to /api/auth/me, /api/profiles and /api/settings.
 */
export default withApiContext("api/bootstrap", async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Personal data: no cache, including the browser's, may keep a copy.
  res.setHeader("Cache-Control", NO_STORE_CACHE_CONTROL);

  const user = await getCurrentUser(req);

  if (!user) {
    res.setHeader("Set-Cookie", clearAuthCookies());
    res.status(401).json({ user: null });
    return;
  }

  const [profiles, savedSettings] = await Promise.all([listProfiles(user.id), getUserSettingsFromDb(user.id)]);

  res.status(200).json({
    user,
    profiles: profiles.map(toPublicProfile),
    activeProfileId: user.activeProfileId ?? profiles[0]?.id ?? null,
    settings: toApiSettingsResponse(savedSettings ?? DEFAULT_SETTINGS),
  });
});
