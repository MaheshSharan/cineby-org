import type { NextApiRequest, NextApiResponse } from "next";
import { getPlayerModeConfig, type PlayerModeConfig } from "@/lib/player/modeConfig";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<PlayerModeConfig>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Cache config briefly in browser / edge (e.g. 60 seconds)
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");

  const config = getPlayerModeConfig();
  return res.status(200).json(config);
}
