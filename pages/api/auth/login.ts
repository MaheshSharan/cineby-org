import type { NextApiRequest, NextApiResponse } from "next";

import { verifyPassword } from "@/lib/auth/password";
import {
  buildAuthCookies,
  createSessionToken,
  SESSION_TTL_MS,
} from "@/lib/auth/session";
import { createSession } from "@/lib/db/sessions";
import { findDefaultProfileId } from "@/lib/db/profiles";
import { findUserByIdentifier, toPublicUser } from "@/lib/db/users";
import { allowAuthAttempt, authClientKey } from "@/lib/auth/rateLimit";
import { withApiContext, validate, sendValidationError } from "@/lib/validation";
import { loginSchema } from "@/lib/validation/auth";

export default withApiContext("api/auth/login", async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rawBody = (req.body ?? {}) as Record<string, unknown>;
  const rawIdentifier =
    typeof rawBody.username === "string" && rawBody.username.trim()
      ? rawBody.username.trim()
      : typeof rawBody.email === "string" && rawBody.email.trim()
      ? rawBody.email.trim()
      : typeof rawBody.identifier === "string" && rawBody.identifier.trim()
      ? rawBody.identifier.trim()
      : "";
  const rawPassword = typeof rawBody.password === "string" ? rawBody.password : "";

  const validation = validate(loginSchema, { identifier: rawIdentifier, password: rawPassword });
  if (!validation.success || !validation.data) {
    sendValidationError(res, validation.errors ?? "Invalid credentials");
    return;
  }

  const { identifier, password } = validation.data;

  if (!(await allowAuthAttempt(authClientKey(req, identifier)))) {
    res.status(429).json({ error: "Too many attempts. Try again later." });
    return;
  }

  const user = await findUserByIdentifier(identifier);

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    res.status(401).json({ error: "Invalid username/email or password." });
    return;
  }

  const token = createSessionToken();
  const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"].slice(0, 500) : null;
  await createSession(user.id, token, new Date(Date.now() + SESSION_TTL_MS).toISOString(), userAgent);

  const existingDefault = await findDefaultProfileId(user.id);
  const hasProfiles = existingDefault !== null;

  res.setHeader("Set-Cookie", buildAuthCookies(token));
  res.status(200).json({
    user: toPublicUser(user, hasProfiles),
    redirectTo: hasProfiles ? "/profiles" : "/profiles?create=true",
  });
});

