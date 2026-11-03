import type { NextApiRequest, NextApiResponse } from "next";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { clearAuthCookies } from "@/lib/auth/session";
import { withApiContext } from "@/lib/validation";

export default withApiContext("api/auth/me", async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const user = await getCurrentUser(req);

  if (!user) {
    res.setHeader("Set-Cookie", clearAuthCookies());
    res.status(401).json({ user: null });
    return;
  }

  res.status(200).json({ user });
});