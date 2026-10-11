import type { NextApiRequest, NextApiResponse } from "next";

import { verifyGoogleIdToken } from "@/lib/auth/google";
import {
  buildSessionCookie,
  createSessionToken,
  SESSION_TTL_MS,
} from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/db/sessions";
import { findDefaultProfileId } from "@/lib/db/profiles";
import { getDb } from "@/lib/db/connection";
import { createUser, findUserByEmail, findUserByIdentifier, toPublicUser } from "@/lib/db/users";
import { allowAuthAttempt, authClientKey } from "@/lib/auth/rateLimit";
import { withApiContext } from "@/lib/validation";
import { getEnvVar } from "@/lib/env";

const GOOGLE_CLIENT_ID = getEnvVar("NEXT_PUBLIC_GOOGLE_CLIENT_ID");

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

    const tokenPayload = await verifyGoogleIdToken(credential, GOOGLE_CLIENT_ID);
    if (!tokenPayload || !tokenPayload.email) {
      res.status(401).json({ error: "Invalid or expired Google credential." });
      return;
    }

    let isNewUser = false;
    let user = await findUserByEmail(tokenPayload.email);

    // Edge case: if email was not matched, check if an existing account's identifier matches the email username
    if (!user) {
      const emailPrefix = tokenPayload.email.split("@")[0].toLowerCase();
      const existingByIdentifier = await findUserByIdentifier(emailPrefix);
      if (existingByIdentifier && (!existingByIdentifier.email.includes("@") || existingByIdentifier.email === emailPrefix)) {
        // Link the real Google email to this existing user
        await getDb().run("UPDATE users SET email = ? WHERE id = ?", [tokenPayload.email, existingByIdentifier.id]);
        user = await findUserByEmail(tokenPayload.email);
      }
    }

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

    res.setHeader("Set-Cookie", buildSessionCookie(sessionToken));
    res.status(200).json({
      user: toPublicUser(user, hasProfiles),
      isNewUser,
      redirectTo: hasProfiles ? "/profiles" : "/profiles?create=true",
    });
  }
);
