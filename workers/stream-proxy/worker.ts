/**
 * Dedicated Cloudflare Worker Media / Stream Proxy
 *
 * Responsibilities:
 * 1. Decode and verify signed proxy descriptors (HMAC SHA-256).
 * 2. Forward upstream range headers for smooth video seeking.
 * 3. Rewrite M3U8 playlists (including #EXT-X-MAP init segments) so all chunks route through the proxy.
 * 4. Transcode SRT subtitles to WebVTT format for browser native HTML5 video tracks.
 * 5. Stream video chunks (.ts, .m4s, init.mp4) directly without buffering in memory.
 * 6. Cache static media segments in Cloudflare Edge Cache.
 */

export interface Env {
  STREAM_PROXY_SECRET: string;
  STREAM_PROXY_ALLOWED_HOSTS?: string;
  CORS_ALLOWED_ORIGINS?: string;
}

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const DEFAULT_TTL_MS = 6 * 60 * 60_000; // 6 hours

interface Descriptor {
  url: string;
  headers: Record<string, string>;
  expiresAt: number;
  ip?: string;
}

// SubtleCrypto HMAC helper for pure Web Standards / Workers runtime
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  // Convert base64url signature back to Uint8Array
  let base64 = signature.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const sigBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  return crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(payload));
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const sigArray = Array.from(new Uint8Array(sigBuffer));
  const base64 = btoa(String.fromCharCode.apply(null, sigArray));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function readDescriptor(token: string, secret: string): Promise<Descriptor | null> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const valid = await verifySignature(payload, signature, secret);
  if (!valid) return null;

  try {
    let base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    const json = atob(base64);
    const parsed = JSON.parse(json) as Partial<Descriptor>;
    if (typeof parsed.url !== "string" || typeof parsed.expiresAt !== "number" || parsed.expiresAt < Date.now()) {
      return null;
    }
    return {
      url: parsed.url,
      headers: parsed.headers ?? {},
      expiresAt: parsed.expiresAt,
      ip: typeof parsed.ip === "string" ? parsed.ip : undefined,
    };
  } catch {
    return null;
  }
}

async function createDescriptorToken(
  url: string,
  headers: Record<string, string>,
  secret: string,
  clientIp?: string
): Promise<string> {
  const descriptor: Descriptor = {
    url,
    headers,
    expiresAt: Date.now() + DEFAULT_TTL_MS,
    ...(clientIp ? { ip: clientIp.trim() } : {}),
  };
  const payloadJson = JSON.stringify(descriptor);
  const base64 = btoa(payloadJson).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const signature = await signPayload(base64, secret);
  return `${base64}.${signature}`;
}

function handleCors(req: Request, env: Env): Headers {
  const headers = new Headers();
  const origin = req.headers.get("Origin");
  const allowed = (env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowed.length > 0) {
    if (origin && allowed.includes(origin)) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
    }
  } else if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }

  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Range, Authorization");
  return headers;
}

export interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
}

export default {
  async fetch(req: Request, env: Env, ctx?: WorkerContext): Promise<Response> {
    const corsHeaders = handleCors(req, env);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      corsHeaders.set("Allow", "GET, HEAD, OPTIONS");
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const rawToken = url.searchParams.get("token") || "";
    const secret = env.STREAM_PROXY_SECRET || "cineby_dev_stream_secret_default_fallback_key";

    const descriptor = await readDescriptor(rawToken, secret);
    if (!descriptor) {
      return new Response(JSON.stringify({ error: "Missing or invalid stream descriptor" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...Object.fromEntries(corsHeaders) },
      });
    }

    // IP-bound verification
    const connectingIp = (
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      ""
    ).trim();

    if (descriptor.ip && connectingIp) {
      const signedIp = descriptor.ip.trim();
      const ipMatches =
        signedIp === connectingIp ||
        signedIp === "127.0.0.1" ||
        signedIp === "::1" ||
        connectingIp === "127.0.0.1" ||
        connectingIp === "::1";

      if (!ipMatches) {
        console.warn(`[proxy] IP mismatch: signed=${signedIp}, connecting=${connectingIp}`);
        return new Response(JSON.stringify({ error: "Access denied: IP mismatch" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(corsHeaders) },
        });
      }
    }

    const rawTargetUrl = descriptor.url;
    let targetUrl: URL;
    try {
      targetUrl = new URL(rawTargetUrl);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid stream URL" }), { status: 400, headers: corsHeaders });
    }

    if (targetUrl.protocol !== "https:" && targetUrl.protocol !== "http:") {
      return new Response(JSON.stringify({ error: "Unsupported stream protocol" }), { status: 400, headers: corsHeaders });
    }

    // SSRF Protections
    if (["localhost", "127.0.0.1", "::1"].includes(targetUrl.hostname) || targetUrl.hostname.endsWith(".local")) {
      return new Response(JSON.stringify({ error: "Private stream hosts are not allowed" }), { status: 403, headers: corsHeaders });
    }

    const customHeaders = descriptor.headers;
    const isVidking =
      rawTargetUrl.includes("vidking") ||
      rawTargetUrl.includes("speedracelight") ||
      rawTargetUrl.includes("stillhaven") ||
      rawTargetUrl.includes("peakstorm") ||
      rawTargetUrl.includes("fastportal") ||
      rawTargetUrl.includes("solidmoon") ||
      rawTargetUrl.includes("echogate");

    const isVidy =
      rawTargetUrl.includes("vidy.st") ||
      rawTargetUrl.includes("wecollege.net") ||
      rawTargetUrl.includes("quietridge") ||
      rawTargetUrl.includes("rockyember");

    const defaultReferer = isVidking
      ? "https://www.vidking.net/"
      : isVidy
      ? "https://www.vidy.st/"
      : rawTargetUrl.includes("vixsrc")
      ? "https://vixsrc.to"
      : "https://www.vidy.st/";
    const defaultOrigin = isVidking
      ? "https://www.vidking.net"
      : isVidy
      ? "https://www.vidy.st"
      : rawTargetUrl.includes("vixsrc")
      ? "https://vixsrc.to"
      : "https://www.vidy.st";

    const activeHeaders: Record<string, string> = {
      "User-Agent": customHeaders["User-Agent"] || DEFAULT_UA,
      Referer: customHeaders["Referer"] || defaultReferer,
      Origin: customHeaders["Origin"] || defaultOrigin,
    };

    const upstreamHeaders = new Headers();
    upstreamHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36");
    upstreamHeaders.set("Referer", activeHeaders["Referer"]);
    upstreamHeaders.set("Origin", activeHeaders["Origin"]);
    upstreamHeaders.set("Accept", "*/*");
    upstreamHeaders.set("Accept-Language", "en-US,en;q=0.9");
    upstreamHeaders.set("Sec-Fetch-Dest", "empty");
    upstreamHeaders.set("Sec-Fetch-Mode", "cors");
    upstreamHeaders.set("Sec-Fetch-Site", "cross-site");
    upstreamHeaders.set("Priority", "u=1, i");

    const range = req.headers.get("range");
    if (range) {
      upstreamHeaders.set("Range", range);
    }

    // Fetch upstream media
    const upstreamRes = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: upstreamHeaders,
    });
    console.log(`[proxy] Fetching upstream ${targetUrl.hostname}${targetUrl.pathname} -> status=${upstreamRes.status} ${upstreamRes.statusText}`);

    if (!upstreamRes.ok) {
      const errClone = upstreamRes.clone();
      const errBody = await errClone.text().catch(() => "");
      console.log(`[proxy] Upstream error body preview: ${errBody.slice(0, 300)}`);
    }

    const responseHeaders = new Headers(corsHeaders);
    const contentType = upstreamRes.headers.get("content-type") || "";
    const isM3u8 =
      rawTargetUrl.includes(".m3u8") ||
      contentType.includes("mpegurl") ||
      contentType.includes("application/x-mpegURL");

    const pathname = targetUrl.pathname.toLowerCase();
    const isStaticChunk =
      pathname.endsWith(".ts") ||
      pathname.endsWith(".m4s") ||
      pathname.endsWith("init.mp4") ||
      contentType.includes("video/mp2t") ||
      contentType.includes("video/iso.segment");

    if (isStaticChunk) {
      responseHeaders.set("Cache-Control", "public, max-age=86400, immutable");
    } else {
      responseHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
    }

    // M3U8 Playlist rewriting
    if (isM3u8) {
      const text = await upstreamRes.text();
      const targetBase = rawTargetUrl.substring(0, rawTargetUrl.lastIndexOf("/") + 1);
      const workerOrigin = url.origin;

      const lines = text.split("\n");
      const rewrittenLines: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          rewrittenLines.push(line);
          continue;
        }

        if (trimmed.startsWith("#EXT-X-KEY:")) {
          const match = /URI="([^"]+)"/.exec(trimmed);
          if (match) {
            const uri = match[1];
            const abs = uri.startsWith("http://") || uri.startsWith("https://") ? uri : new URL(uri, targetBase).toString();
            const token = await createDescriptorToken(abs, activeHeaders, secret, descriptor.ip);
            rewrittenLines.push(trimmed.replace(/URI="[^"]+"/, `URI="${workerOrigin}/?token=${encodeURIComponent(token)}"`));
          } else {
            rewrittenLines.push(line);
          }
          continue;
        }

        if (trimmed.startsWith("#EXT-X-MAP:")) {
          const match = /URI="([^"]+)"/.exec(trimmed);
          if (match) {
            const uri = match[1];
            const abs = uri.startsWith("http://") || uri.startsWith("https://") ? uri : new URL(uri, targetBase).toString();
            const token = await createDescriptorToken(abs, activeHeaders, secret, descriptor.ip);
            rewrittenLines.push(trimmed.replace(/URI="[^"]+"/, `URI="${workerOrigin}/?token=${encodeURIComponent(token)}"`));
            continue;
          }
        }

        if (trimmed.startsWith("#")) {
          rewrittenLines.push(line);
          continue;
        }

        const absUrl = trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : new URL(trimmed, targetBase).toString();
        const token = await createDescriptorToken(absUrl, activeHeaders, secret, descriptor.ip);
        rewrittenLines.push(`${workerOrigin}/?token=${encodeURIComponent(token)}`);
      }

      responseHeaders.set("Content-Type", "application/vnd.apple.mpegurl");
      return new Response(rewrittenLines.join("\n"), {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    }

    // SRT to WebVTT
    const isSrt =
      rawTargetUrl.includes(".srt") ||
      rawTargetUrl.includes("subtitles.vidy.st/download") ||
      rawTargetUrl.includes("subs.videasy.to/download") ||
      contentType.includes("x-subrip") ||
      contentType.includes("text/plain");

    if (isSrt) {
      let text = await upstreamRes.text();
      if (!text.trim().startsWith("WEBVTT")) {
        text = "WEBVTT\n\n" + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
      }
      responseHeaders.set("Content-Type", "text/vtt; charset=utf-8");
      return new Response(text, { status: upstreamRes.status, headers: responseHeaders });
    }

    // Stream chunks directly
    if (upstreamRes.headers.has("content-type")) {
      responseHeaders.set("Content-Type", upstreamRes.headers.get("content-type")!);
    }
    if (upstreamRes.headers.has("content-length")) {
      responseHeaders.set("Content-Length", upstreamRes.headers.get("content-length")!);
    }
    if (upstreamRes.headers.has("content-range")) {
      responseHeaders.set("Content-Range", upstreamRes.headers.get("content-range")!);
    }
    if (upstreamRes.headers.has("accept-ranges")) {
      responseHeaders.set("Accept-Ranges", upstreamRes.headers.get("accept-ranges")!);
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  },
};
