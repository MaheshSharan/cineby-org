import type { NextApiRequest, NextApiResponse } from "next";
import { isValidSid } from "@/lib/security/sid";
import { getPlayerModeConfig } from "@/lib/player/modeConfig";

/**
 * GET /api/stream/canary-script?sid=...
 *
 * An empty script whose only content is a source map reference carrying the tab's sid. The sid is validated
 * against a strict pattern before it is written into the response.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse): void {
  const modeConfig = getPlayerModeConfig();
  if (!modeConfig.nativeEnabled) {
    res.status(404).send("");
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");


  const sid = req.query.sid;

  if (!isValidSid(sid)) {
    res.status(400).send("");

    return;
  }

  res.status(200).send(`//# sourceMappingURL=/api/stream/canary?sid=${sid}\n`);
}
