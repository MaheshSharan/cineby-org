import type { NextApiRequest, NextApiResponse } from "next";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { findUserById, toPublicUser, updateUserDisplayName } from "@/lib/db/users";
import { withApiContext, validate, sendValidationError } from "@/lib/validation";
import { updateUsernameSchema } from "@/lib/validation/auth";

export default withApiContext("api/auth/username", async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST" && req.method !== "PATCH") {
    res.setHeader("Allow", "POST, PATCH");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    res.status(401).json({ error: "You must be logged in to update your name." });
    return;
  }

  const rawBody = (req.body ?? {}) as Record<string, unknown>;
  const validation = validate(updateUsernameSchema, {
    displayName: typeof rawBody.displayName === "string" ? rawBody.displayName : "",
  });

  if (!validation.success || !validation.data) {
    sendValidationError(res, validation.errors ?? "Invalid name data");
    return;
  }

  const { displayName } = validation.data;
  await updateUserDisplayName(currentUser.id, displayName);

  const updatedUserRow = await findUserById(currentUser.id);
  if (!updatedUserRow) {
    res.status(500).json({ error: "Failed to reload updated user." });
    return;
  }

  res.status(200).json({
    success: true,
    user: toPublicUser(updatedUserRow),
  });
});
