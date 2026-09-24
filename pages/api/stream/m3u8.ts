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

function extractClientIp(req: NextApiRequest): string {
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp.trim()) return cfIp.trim();

  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const sockIp = req.socket?.remoteAddress;
  if (typeof sockIp === "string" && sockIp.trim()) return sockIp.trim();

  return "";
}

function getAppOrigin(req: NextApiRequest): string {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = (typeof forwardedHost === "string" ? forwardedHost : req.headers.host) || "";

  if (!host) return "";

  const proto =
    typeof forwardedProto === "string"
      ? forwardedProto.split(",")[0].trim()
      : host.includes("localhost") || host.includes("127.0.0.1")
      ? "http"
      : "https";

  return `${proto}://${host}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string | { error: string }>
) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const clientIp = extractClientIp(req);

  const body = typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : {};
  const query = req.query;

  const targetUrl = typeof body.url === "string" && body.url ? body.url : typeof query.url === "string" ? query.url : null;
  const rawHeaders = (typeof body.headers === "object" && body.headers !== null ? body.headers : {}) as Record<string, string>;
  const refererQuery = typeof query.referer === "string" ? query.referer : "";
  const originQuery = typeof query.origin === "string" ? query.origin : "";

  const headers: Record<string, string> = {
    ...rawHeaders,
    ...(refererQuery ? { Referer: refererQuery } : {}),
    ...(originQuery ? { Origin: originQuery } : {}),
  };

  let m3u8Text: string | null = null;
  let baseUrl: string | null = null;

  if (targetUrl) {
    baseUrl = targetUrl;
    try {
      const fetcherBase = getM3u8FetcherUrl().replace(/\/+$/, "");
      let fetchUrl = targetUrl;
      const isVidyStream =
        targetUrl.includes("vidy") ||
        targetUrl.includes("quietridge") ||
        targetUrl.includes("rockyember") ||
        targetUrl.includes("wecollege");

      const defaultReferer = isVidyStream ? "https://www.vidy.st/" : "https://www.vidking.net/";
      const defaultOrigin = isVidyStream ? "https://www.vidy.st" : "https://www.vidking.net";

      const fetchHeaders: Record<string, string> = {
        Referer: headers["Referer"] ?? defaultReferer,
        Origin: headers["Origin"] ?? defaultOrigin,
        "User-Agent": headers["User-Agent"] ?? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "*/*",
      };

      // If a dedicated serverless M3U8 fetcher (Vercel / Lambda) is configured, route through it
      if (fetcherBase) {
        const params = new URLSearchParams({
          url: targetUrl,
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

  const appOrigin = getAppOrigin(req);

  const toAbsolute = (urlOrPath: string): string => {
    if (urlOrPath.startsWith("/") && appOrigin) {
      return `${appOrigin}${urlOrPath}`;
    }
    return urlOrPath;
  };

  const fallbackUrl = baseUrl ?? targetUrl ?? "";
  const isVidyProxy =
    fallbackUrl.includes("vidy") ||
    fallbackUrl.includes("quietridge") ||
    fallbackUrl.includes("rockyember") ||
    fallbackUrl.includes("wecollege");

  const proxyHeaders: Record<string, string> = {
    Referer: headers["Referer"] ?? (isVidyProxy ? "https://www.vidy.st/" : "https://www.vidking.net/"),
    Origin: headers["Origin"] ?? (isVidyProxy ? "https://www.vidy.st" : "https://www.vidking.net"),
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
        const proxyUrl = toAbsolute(buildStreamProxyUrl(abs, proxyHeaders, clientIp));
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
        const mapUrl = toAbsolute(buildStreamProxyUrl(abs, proxyHeaders, clientIp));
        rewritten.push(t.replace(/URI="[^"]+"/, `URI="${mapUrl}"`));
        continue;
      }
    }

    // Pass through all other tags unchanged
    if (t.startsWith("#")) {
      rewritten.push(line);
      continue;
    }

    // Check if line is a child/variant M3U8 playlist
    const isSubPlaylist = t.endsWith(".m3u8") || t.includes(".m3u8?");
    if (isSubPlaylist) {
      const abs = resolveUrl(t);
      const params = new URLSearchParams({
        url: abs,
        referer: proxyHeaders.Referer || "",
        origin: proxyHeaders.Origin || "",
      });
      rewritten.push(toAbsolute(`/api/stream/m3u8?${params.toString()}`));
      continue;
    }

    // Media segment URLs — route through signed stream proxy
    const abs = resolveUrl(t);
    rewritten.push(toAbsolute(buildStreamProxyUrl(abs, proxyHeaders, clientIp)));
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send(rewritten.join("\n"));
}
