import type { NextApiRequest, NextApiResponse } from "next";
import { withApiContext } from "@/lib/validation";
import { markWorkerExhausted } from "@/lib/providers/workerPoolStore";
import { getStreamProxyUrlPool } from "@/lib/env/server";

interface FeedbackBody {
  workerUrl?: unknown;
  status?: unknown;
}

/**
 * POST /api/stream/feedback
 *
 * Receives runtime feedback from the client player (e.g. HTTP 429 quota reached on an edge worker).
 * Marks the worker exhausted in Redis for 1 hour so the VPS playlist generator avoids it.
 */
export default withApiContext(
  "api/stream/feedback",
  async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    const body = (req.body ?? {}) as FeedbackBody;
    const workerUrl = typeof body.workerUrl === "string" ? body.workerUrl.trim() : "";
    const status = typeof body.status === "number" ? body.status : 0;

    if (!workerUrl || status !== 429) {
      res.status(400).json({ error: "Invalid feedback payload" });
      return;
    }

    // Only allow marking known workers from the configured pool
    const configuredPool = getStreamProxyUrlPool().map((u) => u.toLowerCase().replace(/\/+$/, ""));
    const normalizedInput = workerUrl.toLowerCase().replace(/\/+$/, "");

    const isRecognized = configuredPool.some((configured) => {
      try {
        const inputHost = new URL(normalizedInput).host;
        const confHost = new URL(configured).host;
        return inputHost === confHost;
      } catch {
        return false;
      }
    });

    if (isRecognized) {
      await markWorkerExhausted(workerUrl);
      res.status(200).json({ success: true, message: "Worker marked exhausted for 1 hour" });
      return;
    }

    res.status(200).json({ success: false, message: "Unrecognized worker ignored" });
  }
);
