import type { NextApiRequest, NextApiResponse } from "next";

import { cachedFetch } from "@/lib/cache";
import { applyCorsHeaders } from "@/lib/cors";
import { getFlagsApiBaseUrl } from "@/lib/env/public";
import { logger } from "@/lib/logger";
import { withApiContext } from "@/lib/validation";

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;
const ONE_DAY_SECONDS = 24 * 60 * 60;

export default withApiContext(
  "api/flags/[code]",
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (applyCorsHeaders(req, res)) {
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.setHeader("Allow", ["GET", "HEAD"]);
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    const codeParam = req.query.code;
    const code = typeof codeParam === "string" ? codeParam.toUpperCase().trim() : "";

    if (!/^[A-Z]{2}$/.test(code)) {
      res.status(400).json({ error: "Invalid country code format" });
      return;
    }

    try {
      const base64Data = await cachedFetch<string>({
        key: `flag:${code}`,
        ttlSeconds: SEVEN_DAYS_SECONDS,
        staleSeconds: ONE_DAY_SECONDS,
        fetcher: async () => {
          const upstream = await fetch(`${getFlagsApiBaseUrl()}/${code}/flat/24.png`, { signal: AbortSignal.timeout(5000) });
          if (!upstream.ok) {
            throw new Error(`FlagsAPI returned HTTP ${upstream.status}`);
          }
          const buf = await upstream.arrayBuffer();
          return Buffer.from(buf).toString("base64");
        },
      });

      const imgBuffer = Buffer.from(base64Data, "base64");
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", `public, max-age=${SEVEN_DAYS_SECONDS}, s-maxage=${SEVEN_DAYS_SECONDS}, immutable`);
      res.status(200).send(imgBuffer);
    } catch (error) {
      logger.warn(`[flags] Failed to fetch or cache flag for code ${code}`, { error: String(error) });
      res.setHeader("Cache-Control", "public, max-age=300");
      res.status(404).json({ error: "Flag not found" });
    }
  }
);
