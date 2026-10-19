import type { NextApiRequest, NextApiResponse } from "next";
import { getCorsAllowedOrigins } from "@/lib/env/server";

/**
 * Applies CORS headers from the CORS_ALLOWED_ORIGINS allowlist (comma-separated, required).
 * A request Origin is reflected only when it appears in the list; everything else receives no
 * permissive headers. Preflight OPTIONS requests are answered directly.
 */
export function applyCorsHeaders(req: NextApiRequest, res: NextApiResponse): boolean {
  const allowedOrigins = getCorsAllowedOrigins();
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }

  return false;
}
