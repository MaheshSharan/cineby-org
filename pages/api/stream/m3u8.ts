import type { NextApiRequest, NextApiResponse } from "next";
import { buildStreamProxyUrl } from "@/lib/providers/proxy";
import { getSiteUrl } from "@/lib/env/public";
import { isPrivateHost } from "@/lib/providers/allowlist";
import { createProxyDescriptor, readProxyDescriptor } from "@/lib/providers/signedProxy";
import { isSidFlagged } from "@/lib/security/canaryStore";
import { isValidSid } from "@/lib/security/sid";
import { isEcP256Jwk } from "@/lib/security/tabCrypto";

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
import { getM3u8FetcherUrl, getStreamProxyUrlPool } from "@/lib/env/server";
import { getActiveWorkerPool } from "@/lib/providers/workerPoolStore";

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

  const token = typeof query.token === "string" ? query.token : null;
  let descriptor = token ? readProxyDescriptor(token) : null;
  let urlToken: string | null = null;

  if (!descriptor && typeof body.url === "string" && body.url.includes("token=")) {
    try {
      const base = getAppOrigin(req) || getSiteUrl();
      const u = new URL(body.url, base);
      urlToken = u.searchParams.get("token");
      if (urlToken) {
        descriptor = readProxyDescriptor(urlToken);
      }
    } catch {
      // Malformed URL, token extraction skipped and deferred to targetUrl validation
    }
  }

  if ((token || urlToken) && !descriptor) {
    res.status(403).json({ error: "Invalid or expired playlist token" });
    return;
  }

  const bodySid = isValidSid(body.sid) ? body.sid : undefined;
  const sid = descriptor?.sid ?? bodySid;

  const rawPk = (body.clientPublicKey ?? descriptor?.pk) as unknown;
  const clientPublicKey = isEcP256Jwk(rawPk) ? rawPk : undefined;

  // A tab whose DevTools canary fired gets no new playlists. Segments already in a loaded playlist keep working.
  if (sid && (await isSidFlagged(sid))) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const targetUrl =
    descriptor?.url ??
    (typeof body.url === "string" && body.url ? body.url : typeof query.url === "string" ? query.url : null);
  const bodyHeaders = (typeof body.headers === "object" && body.headers !== null ? body.headers : {}) as Record<string, string>;
  const rawHeaders = { ...bodyHeaders, ...descriptor?.headers };
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
    // Primary fetch via external M3U8 helper (Vercel) with VPS direct fallback
    const fetcherBase = getM3u8FetcherUrl();
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

    let fetchSuccess = false;

    // 1. Try external M3U8 fetcher (Vercel)
    try {
      const upstream = await fetch(`${fetcherBase}?${params.toString()}`, {
        headers: { Accept: "*/*" },
      });

      if (upstream.ok) {
        const text = await upstream.text();
        if (text.trimStart().startsWith("#EXTM3U") || text.trimStart().startsWith("#EXT-X-")) {
          m3u8Text = text;
          fetchSuccess = true;
        }
      }
    } catch {
      // Vercel helper failed, proceed to direct fallback
    }

    // 2. Fallback: if Vercel fails, attempt direct fetch from VPS
    if (!fetchSuccess) {
      try {
        const directUpstream = await fetch(targetUrl, {
          headers: {
            Accept: "*/*",
            ...(fetchReferer ? { Referer: fetchReferer } : {}),
            ...(fetchOrigin ? { Origin: fetchOrigin } : {}),
            "User-Agent":
              headers["User-Agent"] ||
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
          },
        });

        if (directUpstream.ok) {
          const text = await directUpstream.text();
          if (text.trimStart().startsWith("#EXTM3U") || text.trimStart().startsWith("#EXT-X-")) {
            m3u8Text = text;
            fetchSuccess = true;
          }
        }
      } catch {
        // Direct fetch failed
      }
    }

    if (!fetchSuccess || !m3u8Text) {
      res.status(502).json({ error: "Failed to fetch M3U8 from upstream or fetcher pool" });
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

  // Query active edge worker pool from Redis (filters out workers marked exhausted)
  const fullConfiguredPool = getStreamProxyUrlPool();
  const activeWorkerPool = await getActiveWorkerPool(fullConfiguredPool);

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

  const isCinejoy =
    proxyHeaders.Origin === "https://cinejoy.pk" ||
    explicitOrigin === "https://cinejoy.pk" ||
    Boolean(explicitReferer && explicitReferer.includes("cinejoy.pk")) ||
    Boolean(baseUrl && baseUrl.includes("bright67.online")) ||
    Boolean(targetUrl && targetUrl.includes("bright67.online"));

  const buildCinejoyVercelUrl = (absUrl: string): string => {
    const fetcher = getM3u8FetcherUrl();
    const origin = proxyHeaders.Origin || "https://cinejoy.pk";
    const referer = proxyHeaders.Referer || "https://cinejoy.pk/";
    return `${fetcher}?url=${encodeURIComponent(absUrl)}&origin=${encodeURIComponent(origin)}&referer=${encodeURIComponent(referer)}`;
  };

  // Sub-playlists are signed too, so the Network tab never shows the upstream URL.
  const buildPlaylistUrl = (playlistUrl: string): string =>
    `/api/stream/m3u8?token=${createProxyDescriptor(playlistUrl, proxyHeaders, clientIp, sid, clientPublicKey)}`;

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
          const proxyUrl = isCinejoy
            ? buildCinejoyVercelUrl(abs)
            : toAbsolute(buildStreamProxyUrl(abs, proxyHeaders, clientIp, sid, clientPublicKey));
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
          const mapUrl = isCinejoy
            ? buildCinejoyVercelUrl(abs)
            : toAbsolute(buildStreamProxyUrl(abs, proxyHeaders, clientIp, sid, clientPublicKey));
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
          const isMediaPlaylist = abs.includes(".m3u8") || abs.includes("playlist.jpg");
          const replacementUrl = isMediaPlaylist
            ? toAbsolute(buildPlaylistUrl(abs))
            : isCinejoy
            ? buildCinejoyVercelUrl(abs)
            : toAbsolute(buildStreamProxyUrl(abs, proxyHeaders, clientIp, sid, clientPublicKey));
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
        rewritten.push(toAbsolute(buildPlaylistUrl(abs)));
      } else {
        rewritten.push(line);
      }
    } else {
      if (!isPrivateHost(abs)) {
        rewritten.push(
          isCinejoy
            ? buildCinejoyVercelUrl(abs)
            : toAbsolute(buildStreamProxyUrl(abs, proxyHeaders, clientIp, sid, clientPublicKey, activeWorkerPool))
        );
      } else {
        rewritten.push(line);
      }
    }
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send(rewritten.join("\n"));
});
