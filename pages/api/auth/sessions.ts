import type { NextApiRequest, NextApiResponse } from "next";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getSessionToken } from "@/lib/auth/session";
import {
  deleteOtherUserSessions,
  deleteSessionById,
  listUserSessions,
} from "@/lib/db/sessions";
import { withApiContext, validate, sendValidationError } from "@/lib/validation";
import { revokeSessionSchema } from "@/lib/validation/sessions";

export default withApiContext("api/auth/sessions", async (req: NextApiRequest, res: NextApiResponse) => {
  const user = getCurrentUser(req);
  const currentToken = getSessionToken(req);

  if (!user || !currentToken) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.method === "GET") {
    const sessions = listUserSessions(user.id, currentToken);
    res.status(200).json({ sessions });
    return;
  }

  if (req.method === "POST" || req.method === "DELETE") {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const queryId = req.query.id ? Number(req.query.id) : undefined;
    const input = {
      sessionId: queryId ?? (typeof body.sessionId === "number" ? body.sessionId : undefined),
      revokeOthers: body.revokeOthers === true || req.query.allOthers === "true",
    };

    const validation = validate(revokeSessionSchema, input);
    if (!validation.success && validation.errors) {
      sendValidationError(res, validation.errors);
      return;
    }

    if (input.revokeOthers) {
      deleteOtherUserSessions(user.id, currentToken);
      res.status(200).json({ success: true, message: "Other sessions revoked." });
      return;
    }

    if (input.sessionId) {
      const revoked = deleteSessionById(user.id, input.sessionId);
      if (!revoked) {
        res.status(404).json({ error: "Session not found or already revoked." });
        return;
      }
      res.status(200).json({ success: true, message: "Session revoked." });
      return;
    }

    res.status(400).json({ error: "Specify sessionId or revokeOthers." });
    return;
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  res.status(405).json({ error: "Method not allowed" });
});
