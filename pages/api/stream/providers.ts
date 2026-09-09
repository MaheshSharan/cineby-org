import type { NextApiRequest, NextApiResponse } from "next";
import { listAvailableProviders } from "@/lib/providers/registry";

interface ProvidersResponse {
  providers: { id: string; name: string }[];
}

/**
 * GET /api/stream/providers
 *
 * Returns the list of currently enabled, non-circuit-broken providers in
 * priority order. The client uses this to know which client-assisted fetcher
 * to call for the "default" server selection, avoiding wasted fetches to
 * disabled providers.
 */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProvidersResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end();
    return;
  }

  // Short cache — providers don't change at runtime, but allow quick env var
  // changes to propagate within a minute.
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");

  const providers = listAvailableProviders();
  res.status(200).json({ providers });
}
