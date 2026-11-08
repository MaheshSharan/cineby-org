import type { NextApiRequest, NextApiResponse } from "next";
import { getPlayerModeConfig, type PlayerModeConfig } from "@/lib/player/modeConfig";
import { cacheControl } from "@/lib/cache/profiles";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<PlayerModeConfig>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  res.setHeader("Cache-Control", cacheControl("playerConfig"));

  const config = getPlayerModeConfig();
  return res.status(200).json(config);
}
