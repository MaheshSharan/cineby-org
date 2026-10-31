import type { NextApiRequest, NextApiResponse } from "next";

import { hashPassword } from "@/lib/auth/password";
import {
  buildAuthCookies,
  createSessionToken,
  SESSION_TTL_MS,
} from "@/lib/auth/session";
import { createSession } from "@/lib/db/sessions";
import { createUser, findUserByEmail, findUserByIdentifier, toPublicUser } from "@/lib/db/users";
import { allowAuthAttempt, authClientKey } from "@/lib/auth/rateLimit";
import { withApiContext, validate, sendValidationError } from "@/lib/validation";
import { registerSchema } from "@/lib/validation/auth";

export default withApiContext("api/auth/register", async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rawBody = (req.body ?? {}) as Record<string, unknown>;
  const rawUsername =
    typeof rawBody.username === "string" ? rawBody.username.trim() : "";
  const rawEmail =
    typeof rawBody.email === "string" && rawBody.email.trim()
      ? rawBody.email.trim().toLowerCase()
      : undefined;
  const rawPassword = typeof rawBody.password === "string" ? rawBody.password : "";
  const rawDisplayName =
    typeof rawBody.displayName === "string" && rawBody.displayName.trim()
      ? rawBody.displayName.trim().slice(0, 60)
      : rawUsername;

  const validation = validate(registerSchema, {
    username: rawUsername,
    email: rawEmail,
    password: rawPassword,
    displayName: rawDisplayName,
  });

  if (!validation.success || !validation.data) {
    sendValidationError(res, validation.errors ?? "Invalid registration details");
    return;
  }

  const username = validation.data.username;
  const email = (validation.data.email || username).toLowerCase();
  const password = validation.data.password;
  const displayName = validation.data.displayName || username;

  if (!(await allowAuthAttempt(authClientKey(req, username)))) {
    res.status(429).json({ error: "Too many attempts. Try again later." });
    return;
  }

  if (await findUserByIdentifier(username)) {
    res.status(409).json({ error: "An account with this username already exists." });
    return;
  }

  if (validation.data.email && (await findUserByEmail(email))) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser(email, passwordHash, displayName);

  const token = createSessionToken();
  const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"].slice(0, 500) : null;
  await createSession(user.id, token, new Date(Date.now() + SESSION_TTL_MS).toISOString(), userAgent);

  res.setHeader("Set-Cookie", buildAuthCookies(token));
  res.status(201).json({ user: toPublicUser(user, false) });
});

