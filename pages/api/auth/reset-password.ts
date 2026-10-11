import type { NextApiRequest, NextApiResponse } from "next";
import { withApiContext } from "@/lib/validation";

export default withApiContext("api/auth/reset-password", async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  res.status(410).json({
    error: "Public password recovery is unavailable. Sign in and change your password from account settings.",
  });
});
