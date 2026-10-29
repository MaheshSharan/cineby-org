import type { NextApiRequest, NextApiResponse } from "next";
import { listAvailableProvidersWithChildren } from "@/lib/providers/registry";
import { withApiContext } from "@/lib/validation";
import { applyCorsHeaders } from "@/lib/cors";

import { getPlayerModeConfig } from "@/lib/player/modeConfig";

interface ProvidersResponse {
  providers: {
    id: string;
    name: string;
    children?: { id: string; name: string; flagUrl?: string }[];
  }[];
}

/**
 * GET /api/stream/providers
 *
 * Returns the list of currently enabled, non-circuit-broken providers in
 * priority order. The client uses this to know which client-assisted fetcher
 * to call for the "default" server selection, avoiding wasted fetches to
 * disabled providers.
 */
export default withApiContext(
  "api/stream/providers",
  async (req: NextApiRequest, res: NextApiResponse<ProvidersResponse | { error: string }>) => {
    if (applyCorsHeaders(req, res)) {
      return;
    }

    const modeConfig = getPlayerModeConfig();
    if (!modeConfig.nativeEnabled) {
      res.status(404).json({ error: "native_player_disabled" });
      return;
    }

    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      res.status(405).end();
      return;
    }


    // Short cache — providers don't change at runtime, but allow quick env var
    // changes to propagate within a minute.
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");

    const providers = await listAvailableProvidersWithChildren();
    res.status(200).json({ providers });
  }
);
