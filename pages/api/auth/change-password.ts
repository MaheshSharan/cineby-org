import type { NextApiRequest, NextApiResponse } from "next";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getSessionToken } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { deleteOtherUserSessions } from "@/lib/db/sessions";
import { findUserById, updateUserPassword } from "@/lib/db/users";
import { allowAuthAttempt, authClientKey } from "@/lib/auth/rateLimit";
import { withApiContext, validate, sendValidationError } from "@/lib/validation";
import { changePasswordSchema } from "@/lib/validation/auth";

export default withApiContext("api/auth/change-password", async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const currentUser = getCurrentUser(req);
  if (!currentUser) {
    res.status(401).json({ error: "You must be logged in to change your password." });
    return;
  }

  const rawBody = (req.body ?? {}) as Record<string, unknown>;
  const validation = validate(changePasswordSchema, {
    currentPassword: typeof rawBody.currentPassword === "string" ? rawBody.currentPassword : "",
    newPassword: typeof rawBody.newPassword === "string" ? rawBody.newPassword : "",
  });

  if (!validation.success || !validation.data) {
    sendValidationError(res, validation.errors ?? "Invalid password data");
    return;
  }

  const { currentPassword, newPassword } = validation.data;

  if (!allowAuthAttempt(authClientKey(req, String(currentUser.id)))) {
    res.status(429).json({ error: "Too many attempts. Try again later." });
    return;
  }

  const userRow = findUserById(currentUser.id);
  if (!userRow) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  const isValid = await verifyPassword(currentPassword, userRow.password_hash);
  if (!isValid) {
    res.status(400).json({ error: "Incorrect current password." });
    return;
  }

  const newPasswordHash = await hashPassword(newPassword);
  updateUserPassword(currentUser.id, newPasswordHash);
  const currentToken = getSessionToken(req);
  if (currentToken) {
    deleteOtherUserSessions(currentUser.id, currentToken);
  }

  res.status(200).json({ success: true, message: "Password updated successfully." });
});

