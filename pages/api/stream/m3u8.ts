import type { NextApiRequest, NextApiResponse } from "next";
import { buildStreamProxyUrl } from "@/lib/providers/proxy";

/**
 * POST /api/stream/m3u8
 *
 * Two modes:
 *
 * 1. Fetch + rewrite (preferred for client code):
 *    Body: { url: string; headers: Record<string, string> }
 *    Server fetches the M3U8 via the signed stream proxy (so Referer/Origin are
 *    set server-side, bypassing the browser Forbidden Request Header restriction),
 *    then rewrites every segment/key/map URL through the proxy and returns the
 *    rewritten playlist as text/plain.
 *
 * 2. Rewrite-only (legacy, kept for compatibility):
 *    Body: { m3u8Text: string; headers: Record<string, string>; baseUrl: string }
 *    Caller already has the raw M3U8 text; server just rewrites URLs.
 *
 * The client creates a Blob URL from the response and passes it to HLS.js.
 */
function getM3u8FetcherUrl(): string {
  if (process.env.M3U8_FETCHER_URL?.trim()) {
    return process.env.M3U8_FETCHER_URL.trim();
  }
  try {
    const cfContext = (globalThis as unknown as Record<symbol, { env?: Record<string, unknown> }>)[
      Symbol.for("__cloudflare-context__")
    ];
    const cfUrl = cfContext?.env?.M3U8_FETCHER_URL;
    if (typeof cfUrl === "string" && cfUrl.trim()) {
      return cfUrl.trim();
    }
  } catch {}
  return "";
}

export default async function handler(
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

  const headers = (typeof body.headers === "object" && body.headers !== null
    ? body.headers
    : {}) as Record<string, string>;

  let m3u8Text: string | null = null;
  let baseUrl: string | null = null;


  if (typeof body.url === "string" && body.url) {
    baseUrl = body.url;
    try {
      const fetcherBase = getM3u8FetcherUrl().replace(/\/+$/, "");
      let fetchUrl = body.url;
      const fetchHeaders: Record<string, string> = {
        Referer: headers["Referer"] ?? "https://www.vidking.net/",
        Origin: headers["Origin"] ?? "https://www.vidking.net",
        "User-Agent": headers["User-Agent"] ?? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "*/*",
      };

      // If a dedicated serverless M3U8 fetcher (Vercel / Lambda) is configured, route through it
      if (fetcherBase) {
        const params = new URLSearchParams({
          url: body.url,
          referer: fetchHeaders.Referer,
          origin: fetchHeaders.Origin,
        });
        fetchUrl = `${fetcherBase}?${params.toString()}`;
      }

      const upstream = await fetch(fetchUrl, {
        headers: fetcherBase ? { Accept: "*/*" } : fetchHeaders,
      });

      if (!upstream.ok) {
        res.status(502).json({ error: `Upstream returned ${upstream.status}` });
        return;
      }
      m3u8Text = await upstream.text();
    } catch {
      res.status(502).json({ error: "Failed to fetch M3U8 from upstream" });
      return;
    }
  } else if (typeof body.m3u8Text === "string") {
    // Mode 2: caller provides raw text
    m3u8Text = body.m3u8Text;
    baseUrl = typeof body.baseUrl === "string" ? body.baseUrl : null;
  }

  if (!m3u8Text) {
    res.status(400).json({ error: "Provide either 'url' or 'm3u8Text'" });
    return;
  }

  // Reject HTML challenge pages masquerading as M3U8
  const trimmed = m3u8Text.trimStart();
  if (!trimmed.startsWith("#EXTM3U") && !trimmed.startsWith("#EXT-X-")) {
    res.status(422).json({ error: "Provided text is not a valid M3U8 playlist" });
    return;
  }

  const resolveUrl = (relativeOrAbsolute: string): string => {
    if (!baseUrl) return relativeOrAbsolute;
    try {
      return new URL(relativeOrAbsolute, baseUrl).toString();
    } catch {
      return relativeOrAbsolute;
    }
  };

  const proxyHeaders: Record<string, string> = {
    Referer: headers["Referer"] ?? "https://www.vidking.net/",
    Origin: headers["Origin"] ?? "https://www.vidking.net",
  };

  const lines = m3u8Text.split("\n");
  const rewritten: string[] = [];

  for (const line of lines) {
    const t = line.trim();

    if (!t) {
      rewritten.push(line);
      continue;
    }

    // Rewrite #EXT-X-KEY URI (AES-128 encryption key)
    if (t.startsWith("#EXT-X-KEY:")) {
      const match = /URI="([^"]+)"/.exec(t);
      if (match) {
        const uri = match[1];
        const abs = resolveUrl(uri);
        const proxyUrl = buildStreamProxyUrl(abs, proxyHeaders);
        rewritten.push(t.replace(/URI="[^"]+"/, `URI="${proxyUrl}"`));
      } else {
        rewritten.push(line);
      }
      continue;
    }

    // Rewrite #EXT-X-MAP URI (init segment)
    if (t.startsWith("#EXT-X-MAP:")) {
      const match = /URI="([^"]+)"/.exec(t);
      if (match) {
        const uri = match[1];
        const abs = resolveUrl(uri);
        const mapUrl = buildStreamProxyUrl(abs, proxyHeaders);
        rewritten.push(t.replace(/URI="[^"]+"/, `URI="${mapUrl}"`));
        continue;
      }
    }

    // Pass through all other tags unchanged
    if (t.startsWith("#")) {
      rewritten.push(line);
      continue;
    }

    // Media segment URLs — route through signed stream proxy
    const abs = resolveUrl(t);
    rewritten.push(buildStreamProxyUrl(abs, proxyHeaders));
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send(rewritten.join("\n"));
}
