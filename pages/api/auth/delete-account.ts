import type { NextApiRequest, NextApiResponse } from "next";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { verifyPassword } from "@/lib/auth/password";
import { clearAuthCookies } from "@/lib/auth/session";
import { deleteUser, findUserById } from "@/lib/db/users";
import { withApiContext, validate, sendValidationError } from "@/lib/validation";
import { deleteAccountSchema } from "@/lib/validation/auth";

export default withApiContext("api/auth/delete-account", async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST" && req.method !== "DELETE") {
    res.setHeader("Allow", "POST, DELETE");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    res.status(401).json({ error: "You must be logged in to delete your account." });
    return;
  }

  const rawBody = (req.body ?? {}) as Record<string, unknown>;
  const validation = validate(deleteAccountSchema, {
    password: typeof rawBody.password === "string" ? rawBody.password : "",
  });

  if (!validation.success || !validation.data) {
    sendValidationError(res, validation.errors ?? "Password is required");
    return;
  }

  const { password } = validation.data;
  const userRow = await findUserById(currentUser.id);
  if (!userRow) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  const isPasswordValid = await verifyPassword(password, userRow.password_hash);
  if (!isPasswordValid) {
    res.status(400).json({ error: "Incorrect password. Unable to delete account." });
    return;
  }

  await deleteUser(currentUser.id);

  res.setHeader("Set-Cookie", clearAuthCookies());
  res.status(200).json({
    success: true,
    message: "Account deleted successfully.",
  });
});
