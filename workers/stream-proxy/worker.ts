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
  STREAM_PROXY_SECRET?: string;
  CORS_ALLOWED_ORIGINS?: string;
  ENVIRONMENT?: string;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0 && parts[2] === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateHost(hostname: string): boolean {
  let host = hostname.toLowerCase().trim();

  // Strip wrapping brackets (for IPv6 literals like [::1])
  if (host.startsWith("[") && host.includes("]")) {
    const closeBracket = host.indexOf("]");
    host = host.slice(1, closeBracket);
  } else if (host.includes(":") && !host.includes("::")) {
    // If standard host:port format with a single colon, strip port
    const colonIdx = host.indexOf(":");
    if (host.indexOf(":", colonIdx + 1) === -1) {
      host = host.slice(0, colonIdx);
    }
  }

  // Strip trailing DNS root dot
  host = host.replace(/\.+$/, "");

  if (!host) return true;

  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    host.endsWith(".home") ||
    host.endsWith(".corp") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }

  if (
    host === "::1" ||
    host === "::" ||
    host.startsWith("fe80:") ||
    host.startsWith("fe8") ||
    host.startsWith("fe9") ||
    host.startsWith("fea") ||
    host.startsWith("feb") ||
    host.startsWith("fc") ||
    host.startsWith("fd")
  ) {
    return true;
  }

  if (host.startsWith("::ffff:")) {
    return isPrivateIpv4(host.slice(7));
  }

  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    return isPrivateIpv4(host);
  }

  // Block numeric single-value or non-quad IPs (e.g. 2130706433 or 127.1)
  if (/^\d+$/.test(host) || /^(\d+\.){1,2}\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) {
    return true;
  }

  return false;
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

async function signPayload(payload: string, secretOrKey: string | CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const key =
    typeof secretOrKey === "string"
      ? await crypto.subtle.importKey(
          "raw",
          encoder.encode(secretOrKey),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        )
      : secretOrKey;

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
  secretOrKey: string | CryptoKey,
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
  const signature = await signPayload(base64, secretOrKey);
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

    const isDev =
      env.ENVIRONMENT === "development" ||
      (typeof process !== "undefined" && process.env?.NODE_ENV === "development");

    const configuredSecret = env.STREAM_PROXY_SECRET?.trim();
    if (!configuredSecret && !isDev) {
      return new Response(
        JSON.stringify({ error: "Server Misconfiguration: STREAM_PROXY_SECRET is required" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(corsHeaders) },
        }
      );
    }
    const secret = configuredSecret || "cineby_dev_stream_secret_default_fallback_key";

    const descriptor = await readDescriptor(rawToken, secret);
    if (!descriptor) {
      return new Response(JSON.stringify({ error: "Missing or invalid stream descriptor" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...Object.fromEntries(corsHeaders) },
      });
    }

    // IP verification (log mismatch for diagnostics without blocking mobile/CGNAT users)
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
        console.warn(`[proxy] Client IP notice: signed=${signedIp}, connecting=${connectingIp}`);
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

    // SSRF Protections: block private networks, localhost, link-local, and cloud metadata
    if (isPrivateHost(targetUrl.hostname)) {
      return new Response(JSON.stringify({ error: "Access denied: Private or internal target host" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...Object.fromEntries(corsHeaders) },
      });
    }

    const customHeaders = descriptor.headers || {};
    const defaultReferer = targetUrl.origin + "/";
    const defaultOrigin = targetUrl.origin;

    const activeHeaders: Record<string, string> = {
      "User-Agent": customHeaders["User-Agent"] || DEFAULT_UA,
      Referer: customHeaders["Referer"] || defaultReferer,
      Origin: customHeaders["Origin"] || defaultOrigin,
    };

    const upstreamHeaders = new Headers();
    upstreamHeaders.set("User-Agent", activeHeaders["User-Agent"]);
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

    // Fetch upstream media safely with redirect validation
    let currentUrl = targetUrl.toString();
    let upstreamRes: Response | null = null;
    let redirects = 0;
    const MAX_REDIRECTS = 3;

    while (redirects <= MAX_REDIRECTS) {
      let parsedTarget: URL;
      try {
        parsedTarget = new URL(currentUrl);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid stream URL" }), { status: 400, headers: corsHeaders });
      }

      if (parsedTarget.protocol !== "http:" && parsedTarget.protocol !== "https:") {
        return new Response(JSON.stringify({ error: "Unsupported stream protocol" }), { status: 400, headers: corsHeaders });
      }

      if (isPrivateHost(parsedTarget.hostname)) {
        return new Response(JSON.stringify({ error: "Access denied: Private redirect target" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...Object.fromEntries(corsHeaders) },
        });
      }

      upstreamRes = await fetch(currentUrl, {
        method: req.method,
        headers: upstreamHeaders,
        redirect: "manual",
      });

      if (upstreamRes.status >= 300 && upstreamRes.status < 400) {
        const location = upstreamRes.headers.get("Location") || upstreamRes.headers.get("location");
        if (location && redirects < MAX_REDIRECTS) {
          redirects++;
          currentUrl = new URL(location, currentUrl).toString();
          continue;
        }
      }
      break;
    }

    if (!upstreamRes) {
      return new Response(JSON.stringify({ error: "Upstream stream fetch failed" }), { status: 502, headers: corsHeaders });
    }

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
      const signingKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

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
            if (!isPrivateHost(abs)) {
              const token = await createDescriptorToken(abs, activeHeaders, signingKey, descriptor.ip);
              rewrittenLines.push(trimmed.replace(/URI="[^"]+"/, `URI="${workerOrigin}/?token=${encodeURIComponent(token)}"`));
            } else {
              rewrittenLines.push(line);
            }
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
            if (!isPrivateHost(abs)) {
              const token = await createDescriptorToken(abs, activeHeaders, signingKey, descriptor.ip);
              rewrittenLines.push(trimmed.replace(/URI="[^"]+"/, `URI="${workerOrigin}/?token=${encodeURIComponent(token)}"`));
            } else {
              rewrittenLines.push(line);
            }
            continue;
          }
        }

        if (trimmed.startsWith("#EXT-X-MEDIA:")) {
          const match = /URI="([^"]+)"/.exec(trimmed);
          if (match) {
            const uri = match[1];
            const abs = uri.startsWith("http://") || uri.startsWith("https://") ? uri : new URL(uri, targetBase).toString();
            if (!isPrivateHost(abs)) {
              const token = await createDescriptorToken(abs, activeHeaders, signingKey, descriptor.ip);
              rewrittenLines.push(trimmed.replace(/URI="[^"]+"/, `URI="${workerOrigin}/?token=${encodeURIComponent(token)}"`));
            } else {
              rewrittenLines.push(line);
            }
            continue;
          }
        }

        if (trimmed.startsWith("#")) {
          rewrittenLines.push(line);
          continue;
        }

        const absUrl = trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : new URL(trimmed, targetBase).toString();
        if (!isPrivateHost(absUrl)) {
          const token = await createDescriptorToken(absUrl, activeHeaders, signingKey, descriptor.ip);
          rewrittenLines.push(`${workerOrigin}/?token=${encodeURIComponent(token)}`);
        } else {
          rewrittenLines.push(line);
        }
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
