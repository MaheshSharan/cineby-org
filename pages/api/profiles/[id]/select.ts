import type { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getSessionToken } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { findProfile, listProfiles } from "@/lib/db/profiles";
import { setActiveProfile } from "@/lib/db/sessions";
import { withApiContext } from "@/lib/validation";

export default withApiContext(
  "api/profiles/[id]/select",
  async (req: NextApiRequest, res: NextApiResponse) => {
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

    const rawId = String(req.query.id ?? "");
    const profileId = Number(rawId.replace(/^profile-/, ""));
    const profile = Number.isInteger(profileId) ? await findProfile(user.id, profileId) : null;
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const pin = typeof body.pin === "string" ? body.pin : "";
    if (profile.pin_hash && !(await verifyPassword(pin, profile.pin_hash))) {
      res.status(403).json({ error: "Incorrect profile PIN" });
      return;
    }

    const token = getSessionToken(req);
    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    await setActiveProfile(token, profile.id);
    const profiles = await listProfiles(user.id);

    res.status(200).json({
      profile: {
        id: profile.id,
        name: profile.name,
        avatarUrl: profile.avatar_url,
        hasPin: Boolean(profile.pin_hash),
      },
      profileCount: profiles.length,
    });
  }
);
