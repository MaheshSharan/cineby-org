import type { NextApiRequest, NextApiResponse } from "next";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getSessionToken } from "@/lib/auth/session";
import { createProfile, listProfiles } from "@/lib/db/profiles";
import { toPublicProfile } from "@/lib/profile/publicProfile";

import { withApiContext, validate, sendValidationError } from "@/lib/validation";
import { createProfileSchema } from "@/lib/validation/profiles";

const DEFAULT_AVATAR = "/avatar/classic-1.png";
const MAX_PROFILES = 5;

export default withApiContext("api/profiles", async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.method === "GET") {
    const profiles = await listProfiles(user.id);
    res.status(200).json({ profiles: profiles.map(toPublicProfile), activeProfileId: user.activeProfileId ?? profiles[0]?.id });
    return;
  }

  if (req.method === "POST") {
    const rawBody = (req.body ?? {}) as Record<string, unknown>;
    const body: Record<string, unknown> = {
      name: typeof rawBody.name === "string" ? rawBody.name.trim() : "",
      avatarUrl: typeof rawBody.avatarUrl === "string" ? rawBody.avatarUrl : DEFAULT_AVATAR,
    };

    if (typeof rawBody.pin === "string" && rawBody.pin.trim()) {
      body.pin = rawBody.pin.trim();
    }
    if (Array.isArray(rawBody.movieGenres)) {
      body.movieGenres = rawBody.movieGenres.filter((item): item is string => typeof item === "string");
    }
    if (Array.isArray(rawBody.tvGenres)) {
      body.tvGenres = rawBody.tvGenres.filter((item): item is string => typeof item === "string");
    }
    if (typeof rawBody.autoSelect === "boolean") {
      body.autoSelect = rawBody.autoSelect;
    }

    const validation = validate(createProfileSchema, body);
    if (!validation.success || !validation.data) {
      sendValidationError(res, validation.errors ?? "Invalid profile data");
      return;
    }

    const existingProfiles = await listProfiles(user.id);
    if (existingProfiles.length >= MAX_PROFILES) {
      res.status(409).json({ error: "Maximum profile limit reached." });
      return;
    }

    const token = getSessionToken(req);
    const profile = await createProfile(user.id, {
      name: validation.data.name,
      avatarUrl: validation.data.avatarUrl,
      pin: validation.data.pin,
      movieGenres: validation.data.movieGenres,
      tvGenres: validation.data.tvGenres,
      autoSelect: validation.data.autoSelect ?? false,
      sessionToken: token,
    });
    res.status(201).json({ profile: toPublicProfile(profile) });
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "Method not allowed" });
});
