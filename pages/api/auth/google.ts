import type { NextApiRequest, NextApiResponse } from "next";

import { verifyGoogleIdToken } from "@/lib/auth/google";
import {
  buildAuthCookies,
  createSessionToken,
  SESSION_TTL_MS,
} from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/db/sessions";
import { findDefaultProfileId } from "@/lib/db/profiles";
import { createUser, findUserByEmail, toPublicUser } from "@/lib/db/users";
import { allowAuthAttempt, authClientKey } from "@/lib/auth/rateLimit";
import { withApiContext } from "@/lib/validation";
import { getGoogleClientId } from "@/lib/env/public";

export default withApiContext(
  "api/auth/google",
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const rawBody = (req.body ?? {}) as Record<string, unknown>;
    const credential = typeof rawBody.credential === "string" ? rawBody.credential.trim() : "";

    if (!credential) {
      res.status(400).json({ error: "Missing credential token" });
      return;
    }

    if (!(await allowAuthAttempt(authClientKey(req, "google-oauth")))) {
      res.status(429).json({ error: "Too many attempts. Try again later." });
      return;
    }

    const tokenPayload = await verifyGoogleIdToken(credential, getGoogleClientId());
    if (!tokenPayload || !tokenPayload.email) {
      res.status(401).json({ error: "Invalid or expired Google credential." });
      return;
    }

    let isNewUser = false;
    let user = await findUserByEmail(tokenPayload.email);

    if (!user) {
      isNewUser = true;
      // Generate secure random unguessable password hash for OAuth-created users
      const randomSecret = crypto.randomUUID() + crypto.randomUUID();
      const generatedPasswordHash = await hashPassword(randomSecret);

      const displayName =
        tokenPayload.name?.trim() ||
        tokenPayload.given_name?.trim() ||
        tokenPayload.email.split("@")[0];

      user = await createUser(
        tokenPayload.email,
        generatedPasswordHash,
        displayName,
        tokenPayload.picture ?? null
      );
    }

    const sessionToken = createSessionToken();
    const userAgent =
      typeof req.headers["user-agent"] === "string"
        ? req.headers["user-agent"].slice(0, 500)
        : null;

    await createSession(
      user.id,
      sessionToken,
      new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      userAgent
    );

    // If existing user has zero profiles, provide default
    const existingDefault = await findDefaultProfileId(user.id);
    const hasProfiles = existingDefault !== null;

    res.setHeader("Set-Cookie", buildAuthCookies(sessionToken));
    res.status(200).json({
      user: toPublicUser(user, hasProfiles),
      isNewUser,
      redirectTo: hasProfiles ? "/profiles" : "/profiles?create=true",
    });
  }
);
