import type { NextApiRequest, NextApiResponse } from "next";
import { buildStreamProxyUrl } from "@/lib/providers/proxy";

/**
 * POST /api/stream/m3u8
 *
 * Accepts a raw M3U8 playlist fetched browser-side (from hosts like moon.peakstorm.top
 * that block datacenter IPs but allow browser requests), rewrites every media segment
 * URL through the stream proxy, and returns the rewritten playlist as text/plain.
 *
 * The client creates a Blob URL from this text and passes it to HLS.js.
 *
 * Body: { m3u8Text: string; headers: Record<string, string>; baseUrl: string }
 *   - m3u8Text  Raw M3U8 content fetched from the upstream CDN
 *   - headers   Headers to embed in each proxy token (Referer, Origin, User-Agent)
 *   - baseUrl   The URL the M3U8 was fetched from (used to resolve relative segment paths)
 */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<string | { error: string }>
) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const body = typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};

  const m3u8Text = typeof body.m3u8Text === "string" ? body.m3u8Text : null;
  const headers = (typeof body.headers === "object" && body.headers !== null
    ? body.headers
    : {}) as Record<string, string>;
  const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl : null;

  if (!m3u8Text) {
    res.status(400).json({ error: "Missing m3u8Text" });
    return;
  }

  // Quick sanity check — reject HTML challenge pages masquerading as M3U8
  const trimmed = m3u8Text.trimStart();
  if (!trimmed.startsWith("#EXTM3U") && !trimmed.startsWith("#EXT-X-")) {
    res.status(422).json({ error: "Provided text is not a valid M3U8 playlist" });
    return;
  }

  const base = baseUrl ? baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1) : "";

  const lines = m3u8Text.split("\n");
  const rewritten: string[] = [];

  for (const line of lines) {
    const t = line.trim();

    if (!t) {
      rewritten.push(line);
      continue;
    }

    // Rewrite #EXT-X-MAP URI (init segment)
    if (t.startsWith("#EXT-X-MAP:")) {
      const match = /URI="([^"]+)"/.exec(t);
      if (match) {
        const uri = match[1];
        const abs = uri.startsWith("http://") || uri.startsWith("https://") ? uri : `${base}${uri}`;
        const proxyUrl = buildStreamProxyUrl(abs, headers);
        rewritten.push(t.replace(/URI="[^"]+"/, `URI="${proxyUrl}"`));
        continue;
      }
    }

    // Pass through all other tags unchanged
    if (t.startsWith("#")) {
      rewritten.push(line);
      continue;
    }

    // Rewrite media segment URLs (relative or absolute)
    const abs = t.startsWith("http://") || t.startsWith("https://") ? t : `${base}${t}`;
    rewritten.push(buildStreamProxyUrl(abs, headers));
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send(rewritten.join("\n"));
}
