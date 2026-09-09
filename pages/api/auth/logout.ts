import type { NextApiRequest, NextApiResponse } from "next";

import { clearSessionCookie, getSessionToken } from "@/lib/auth/session";
import { deleteSession } from "@/lib/db/sessions";
import { withApiContext } from "@/lib/validation";

export default withApiContext("api/auth/logout", (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const token = getSessionToken(req);

  if (token) {
    deleteSession(token);
  }

  res.setHeader("Set-Cookie", clearSessionCookie());
  res.status(200).json({ ok: true });
});