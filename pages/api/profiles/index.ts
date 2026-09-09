import type { NextApiRequest, NextApiResponse } from "next";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { createProfile, listProfiles } from "@/lib/db/profiles";

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
    const body = {
      name: typeof rawBody.name === "string" ? rawBody.name.trim() : "",
      avatarUrl: typeof rawBody.avatarUrl === "string" ? rawBody.avatarUrl : DEFAULT_AVATAR,
    };

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

    const profile = await createProfile(user.id, { name: validation.data.name, avatarUrl: validation.data.avatarUrl });
    res.status(201).json({ profile: toPublicProfile(profile) });
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "Method not allowed" });
});

import type { ProfileRow } from "@/lib/db/profiles";

function toPublicProfile(profile: ProfileRow) {
  return {
    id: profile.id,
    name: profile.name,
    avatarUrl: profile.avatar_url,
    hasPin: Boolean(profile.pin_hash),
    movieGenres: parseGenres(profile.movie_genres),
    tvGenres: parseGenres(profile.tv_genres),
  };
}

function parseGenres(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
  } catch {
    return [];
  }
}
