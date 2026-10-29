import type { NextApiRequest, NextApiResponse } from "next";
import { flagSid } from "@/lib/security/canaryStore";
import { isValidSid } from "@/lib/security/sid";
import { getPlayerModeConfig } from "@/lib/player/modeConfig";


const EMPTY_SOURCE_MAP = { version: 3, file: "canary.js", sources: [], names: [], mappings: "" };

/**
 * GET /api/stream/canary?sid=...
 *
 * Browsers request a script's source map from inside DevTools, not from the page, so a hit here means that
 * tab has DevTools open. The tab's sid is flagged and later stream requests carrying it get 403.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const modeConfig = getPlayerModeConfig();
  if (!modeConfig.nativeEnabled) {
    res.status(404).json({ error: "native_player_disabled" });
    return;
  }

  res.setHeader("Cache-Control", "no-store");

  if (isValidSid(req.query.sid)) {
    await flagSid(req.query.sid);
  }


  res.status(200).json(EMPTY_SOURCE_MAP);
}
