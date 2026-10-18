import type { NextApiRequest, NextApiResponse } from "next";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { findUserById, toPublicUser, updateUserAvatar } from "@/lib/db/users";
import { withApiContext } from "@/lib/validation";

const MAX_AVATAR_SIZE_BYTES = 3 * 1024 * 1024; // 3MB

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};

export default withApiContext("api/auth/avatar", async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    res.status(401).json({ error: "You must be logged in to update your avatar." });
    return;
  }

  const body: unknown = req.body;
  const avatar =
    typeof body === "object" && body !== null && "avatar" in body && typeof (body as { avatar: unknown }).avatar === "string"
      ? (body as { avatar: string }).avatar.trim()
      : "";

  if (!avatar) {
    res.status(400).json({ error: "Avatar data is required." });
    return;
  }

  if (avatar.length > MAX_AVATAR_SIZE_BYTES) {
    res.status(400).json({ error: "Avatar file size must be less than 3MB." });
    return;
  }

  if (!/^\/avatar\/classic-(?:[1-9]|1\d|2\d|30)\.png$/.test(avatar)) {
    res.status(400).json({ error: "Invalid image format." });
    return;
  }

  await updateUserAvatar(currentUser.id, avatar);
  const updatedUserRow = await findUserById(currentUser.id);

  if (!updatedUserRow) {
    res.status(500).json({ error: "Failed to load updated user." });
    return;
  }

  res.status(200).json({
    success: true,
    user: toPublicUser(updatedUserRow),
  });
});
