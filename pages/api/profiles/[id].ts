import type { NextApiRequest, NextApiResponse } from "next";
import { hashPassword } from "@/lib/auth/password";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { deleteProfile, findProfile, listProfiles, updateProfile } from "@/lib/db/profiles";

import { withApiContext, validate, sendValidationError } from "@/lib/validation";
import { updateProfileSchema } from "@/lib/validation/profiles";

export default withApiContext("api/profiles/[id]", async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getCurrentUser(req);
  if (!user) { res.status(401).json({ error: "Authentication required" }); return; }
  const profileId = Number(req.query.id);
  if (!Number.isInteger(profileId) || profileId <= 0) { res.status(400).json({ error: "Invalid profile id" }); return; }
  const profile = await findProfile(user.id, profileId);
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

  if (req.method === "DELETE") {
    const profileCount = await findProfileCount(user.id);
    if (profileCount <= 1) { res.status(409).json({ error: "The last profile cannot be deleted." }); return; }
    await deleteProfile(user.id, profileId);
    res.status(204).end();
    return;
  }

  if (req.method === "PATCH") {
    const rawBody = (req.body ?? {}) as Record<string, unknown>;
    const validation = validate(updateProfileSchema, rawBody);
    if (!validation.success || !validation.data) {
      sendValidationError(res, validation.errors ?? "Invalid profile data");
      return;
    }

    const name = validation.data.name ?? profile.name;
    const avatarUrl = validation.data.avatarUrl ?? profile.avatar_url;
    const hasPinInput = typeof rawBody.pin === "string";
    const pin = validation.data.pin?.trim() ?? "";

    const updated = await updateProfile(user.id, profileId, {
      name,
      avatarUrl,
      pinHash: hasPinInput ? (pin ? await hashPassword(pin) : null) : profile.pin_hash,
      movieGenres: Array.isArray(rawBody.movieGenres) ? rawBody.movieGenres.filter((item): item is string => typeof item === "string") : [],
      tvGenres: Array.isArray(rawBody.tvGenres) ? rawBody.tvGenres.filter((item): item is string => typeof item === "string") : [],
    });
    res.status(200).json({ profile: updated ? { id: updated.id, name: updated.name, avatarUrl: updated.avatar_url, hasPin: Boolean(updated.pin_hash) } : null });
    return;
  }

  res.setHeader("Allow", "PATCH, DELETE");
  res.status(405).json({ error: "Method not allowed" });
});

async function findProfileCount(userId: number): Promise<number> {
  const profiles = await listProfiles(userId);
  return profiles.length;
}
