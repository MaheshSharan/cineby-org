import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAdConfig } from "@/lib/ads/serverConfig";
import type { AdConfig } from "@/lib/ads/types";
import { applyCorsHeaders } from "@/lib/cors";
import { withApiContext } from "@/lib/validation";

function readCountryCode(req: NextApiRequest): string | undefined {
  const header = req.headers["cf-ipcountry"];

  return Array.isArray(header) ? header[0] : header;
}

/**
 * GET /api/ads/config
 *
 * Tells the player whether to run a video ad and with which tag. Disabled when the kill switch
 * is off or the visitor is in a region that needs a consent banner.
 */
export default withApiContext(
  "api/ads/config",
  async (req: NextApiRequest, res: NextApiResponse<AdConfig>) => {
    if (applyCorsHeaders(req, res)) {
      return;
    }

    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      res.status(405).end();
      return;
    }

    // The answer depends on the visitor's country, so shared caches must not store it.
    res.setHeader("Cache-Control", "private, max-age=60");
    res.status(200).json(resolveAdConfig(readCountryCode(req)));
  }
);
