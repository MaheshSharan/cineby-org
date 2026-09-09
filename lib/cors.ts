import type { NextApiRequest, NextApiResponse } from "next";
import { getCorsAllowedOrigins } from "@/lib/env";

/**
 * Handles CORS headers securely using centralized environment configuration.
 *
 * Rules:
 * 1. If CORS_ALLOWED_ORIGINS is configured (comma-separated):
 *    - Validates request Origin against allowed list.
 *    - If matched, reflects the exact origin.
 *    - If not matched, does not emit permissive access headers.
 * 2. If CORS_ALLOWED_ORIGINS is empty (default in local/same-origin mode):
 *    - Allows requests originating from the same host or trusted origins, avoiding open '*' wildcard defaults.
 * 3. Handles preflight OPTIONS requests cleanly.
 */
export function applyCorsHeaders(req: NextApiRequest, res: NextApiResponse): boolean {
  const allowedOrigins = getCorsAllowedOrigins();
  const origin = req.headers.origin;

  if (allowedOrigins.length > 0) {
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
  } else if (origin) {
    // In dev / same-origin setups without explicit CORS_ALLOWED_ORIGINS,
    // match same-origin or localhost origins safely rather than hardcoding '*'
    try {
      const originUrl = new URL(origin);
      const host = req.headers.host;
      if (host && (originUrl.host === host || originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1")) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
      }
    } catch {
      // Ignore invalid origin strings
    }
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }

  return false;
}
