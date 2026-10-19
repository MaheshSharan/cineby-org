import type { NextApiRequest, NextApiResponse } from "next";
import { buildStreamProxyUrl } from "@/lib/providers/proxy";
import { isPrivateHost } from "@/lib/providers/allowlist";

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
import { getM3u8FetcherUrl } from "@/lib/env/server";

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
  const host = req.headers.host || "";
  if (!host) return "";

  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto =
    typeof forwardedProto === "string"
      ? forwardedProto.split(",")[0].trim()
      : host.includes("localhost") || host.includes("127.0.0.1")
      ? "http"
      : "https";

  return `${proto}://${host}`;
}

import { withApiContext } from "@/lib/validation";

export default withApiContext(
  "api/stream/m3u8",
  async (req: NextApiRequest, res: NextApiResponse) => {
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
    let parsedTargetUrl: URL;
    try {
      parsedTargetUrl = new URL(targetUrl);
    } catch {
      res.status(400).json({ error: "Invalid stream URL" });
      return;
    }

    if (parsedTargetUrl.protocol !== "https:" && parsedTargetUrl.protocol !== "http:") {
      res.status(400).json({ error: "Unsupported stream URL protocol" });
      return;
    }

    if (isPrivateHost(parsedTargetUrl.hostname)) {
      res.status(403).json({ error: "Stream host is private or internal" });
      return;
    }

    baseUrl = targetUrl;
    // Read outside the try block so a missing M3U8_FETCHER_URL is a configuration error, not a 502.
    const fetcherBase = getM3u8FetcherUrl();
    try {
      const explicitReferer = headers.Referer || headers.referer || refererQuery;
      const explicitOrigin = headers.Origin || headers.origin || originQuery;
      const targetOrigin = parsedTargetUrl ? parsedTargetUrl.origin : "";
      const fetchReferer = explicitReferer || (targetOrigin ? `${targetOrigin}/` : "");
      const fetchOrigin = explicitOrigin || targetOrigin;

      const params = new URLSearchParams({
        url: targetUrl,
        ...(fetchReferer ? { referer: fetchReferer } : {}),
        ...(fetchOrigin ? { origin: fetchOrigin } : {}),
      });
      const upstream = await fetch(`${fetcherBase}?${params.toString()}`, {
        headers: { Accept: "*/*" },
      });

      if (!upstream.ok) {
        res.status(502).json({ error: `Upstream returned ${upstream.status}` });
        return;
      }
      m3u8Text = await upstream.text();
    } catch (fetchErr: unknown) {
      const status = (fetchErr as { status?: number })?.status;
      if (status === 403) {
        res.status(403).json({ error: "Stream host is private or internal" });
        return;
      }
      if (status === 400) {
        res.status(400).json({ error: (fetchErr as Error)?.message || "Invalid stream URL" });
        return;
      }
      res.status(502).json({ error: "Failed to fetch M3U8 from upstream" });
      return;
    }
  } else if (typeof body.m3u8Text === "string") {
    // Mode 2: caller provides raw text
    m3u8Text = body.m3u8Text;
    baseUrl = typeof body.baseUrl === "string" ? body.baseUrl : null;
    if (baseUrl) {
      let parsedBaseUrl: URL;
      try {
        parsedBaseUrl = new URL(baseUrl);
      } catch {
        res.status(400).json({ error: "Invalid baseUrl" });
        return;
      }

      if (parsedBaseUrl.protocol !== "https:" && parsedBaseUrl.protocol !== "http:") {
        res.status(400).json({ error: "Unsupported baseUrl protocol" });
        return;
      }

      if (isPrivateHost(parsedBaseUrl.hostname)) {
        res.status(403).json({ error: "Stream host is private or internal" });
        return;
      }
    }
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

  const explicitReferer = headers.Referer || headers.referer || refererQuery;
  const explicitOrigin = headers.Origin || headers.origin || originQuery;
  let fallbackOrigin = "";
  try {
    const fallbackUrl = baseUrl ?? targetUrl ?? "";
    if (fallbackUrl) fallbackOrigin = new URL(fallbackUrl).origin;
  } catch {
    // Relative or invalid stream URLs cannot supply origin header; fallback remains empty string per §16
  }

  const proxyHeaders: Record<string, string> = {
    Referer: explicitReferer || (fallbackOrigin ? `${fallbackOrigin}/` : ""),
    Origin: explicitOrigin || fallbackOrigin,
  };

  const lines = m3u8Text.split("\n");
  const rewritten: string[] = [];
  let expectingSegment = false;
  let expectingVariant = false;

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
        if (!isPrivateHost(abs)) {
          const proxyUrl = toAbsolute(buildStreamProxyUrl(abs, proxyHeaders, clientIp));
          rewritten.push(t.replace(/URI="[^"]+"/, `URI="${proxyUrl}"`));
        } else {
          rewritten.push(line);
        }
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
        if (!isPrivateHost(abs)) {
          const mapUrl = toAbsolute(buildStreamProxyUrl(abs, proxyHeaders, clientIp));
          rewritten.push(t.replace(/URI="[^"]+"/, `URI="${mapUrl}"`));
        } else {
          rewritten.push(line);
        }
        continue;
      }
    }

    // Rewrite #EXT-X-MEDIA URI (alternate audio / subtitle renditions)
    if (t.startsWith("#EXT-X-MEDIA:")) {
      const match = /URI="([^"]+)"/.exec(t);
      if (match) {
        const uri = match[1];
        const abs = resolveUrl(uri);
        if (!isPrivateHost(abs)) {
          const isMediaPlaylist = abs.includes(".m3u8");
          const replacementUrl = isMediaPlaylist
            ? toAbsolute(
                `/api/stream/m3u8?${new URLSearchParams({
                  url: abs,
                  referer: proxyHeaders.Referer || "",
                  origin: proxyHeaders.Origin || "",
                }).toString()}`
              )
            : toAbsolute(buildStreamProxyUrl(abs, proxyHeaders, clientIp));
          rewritten.push(t.replace(/URI="[^"]+"/, `URI="${replacementUrl}"`));
        } else {
          rewritten.push(line);
        }
      } else {
        rewritten.push(line);
      }
      continue;
    }

    // Track tag hints for next URI line
    if (t.startsWith("#EXTINF:")) {
      expectingSegment = true;
      expectingVariant = false;
      rewritten.push(line);
      continue;
    }

    if (t.startsWith("#EXT-X-STREAM-INF:") || t.startsWith("#EXT-X-I-FRAME-STREAM-INF:")) {
      expectingVariant = true;
      expectingSegment = false;
      rewritten.push(line);
      continue;
    }

    // Pass through all other tags / comments
    if (t.startsWith("#")) {
      rewritten.push(line);
      continue;
    }

    const wasExpectingSegment = expectingSegment;
    const wasExpectingVariant = expectingVariant;
    expectingSegment = false;
    expectingVariant = false;

    const abs = resolveUrl(t);
    let isSubPlaylist = false;

    if (wasExpectingVariant) {
      isSubPlaylist = true;
    } else if (wasExpectingSegment) {
      isSubPlaylist = false;
    } else {
      try {
        const pathname = new URL(abs).pathname.toLowerCase();
        isSubPlaylist = pathname.endsWith(".m3u8");
      } catch {
        isSubPlaylist = t.endsWith(".m3u8") || t.split("?")[0].endsWith(".m3u8");
      }
    }

    if (isSubPlaylist) {
      if (!isPrivateHost(abs)) {
        const params = new URLSearchParams({
          url: abs,
          referer: proxyHeaders.Referer || "",
          origin: proxyHeaders.Origin || "",
        });
        rewritten.push(toAbsolute(`/api/stream/m3u8?${params.toString()}`));
      } else {
        rewritten.push(line);
      }
    } else {
      if (!isPrivateHost(abs)) {
        rewritten.push(toAbsolute(buildStreamProxyUrl(abs, proxyHeaders, clientIp)));
      } else {
        rewritten.push(line);
      }
    }
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send(rewritten.join("\n"));
});
