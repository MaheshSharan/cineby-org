import type { NextApiRequest, NextApiResponse } from "next";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { createProxyDescriptor, readProxyDescriptor } from "@/lib/providers/signedProxy";
import { applyCorsHeaders } from "@/lib/cors";
import { isPrivateHost } from "@/lib/providers/allowlist";
import { withApiContext } from "@/lib/validation";

export const config = {
  api: {
    responseLimit: false,
    bodyParser: false,
  },
};

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export default withApiContext("api/stream/proxy", async (req: NextApiRequest, res: NextApiResponse) => {
  if (applyCorsHeaders(req, res)) {
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", ["GET", "HEAD", "OPTIONS"]);
    res.status(405).end();
    return;
  }

  const rawToken = typeof req.query.token === "string" ? req.query.token : "";
  const descriptor = rawToken ? readProxyDescriptor(rawToken) : null;
  if (!descriptor) {
    res.status(401).json({ error: "Missing or invalid stream descriptor" });
    return;
  }
  const rawTargetUrl = descriptor.url;
  const customHeaders = descriptor.headers || {};

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawTargetUrl);
  } catch {
    res.status(400).json({ error: "Invalid stream URL" });
    return;
  }

  if (targetUrl.protocol !== "https:" && targetUrl.protocol !== "http:") {
    res.status(400).json({ error: "Unsupported stream URL protocol" });
    return;
  }

  if (isPrivateHost(targetUrl.hostname)) {
    res.status(403).json({ error: "Stream host is private or internal" });
    return;
  }

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

  if (req.headers.range) {
    upstreamHeaders.set("Range", req.headers.range);
  }

  try {
    let currentUrl = targetUrl.toString();
    let upstreamRes: Response | null = null;
    let redirects = 0;
    const MAX_REDIRECTS = 3;

    while (redirects <= MAX_REDIRECTS) {
      const parsed = new URL(currentUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        res.status(400).json({ error: "Unsupported stream URL protocol" });
        return;
      }
      if (isPrivateHost(parsed.hostname)) {
        res.status(403).json({ error: "Stream host is private or internal" });
        return;
      }

      upstreamRes = await fetch(currentUrl, {
        method: req.method,
        headers: upstreamHeaders,
        redirect: "manual",
      });

      if (upstreamRes.status >= 300 && upstreamRes.status < 400) {
        const location = upstreamRes.headers.get("location");
        if (location && redirects < MAX_REDIRECTS) {
          redirects++;
          currentUrl = new URL(location, currentUrl).toString();
          continue;
        }
      }
      break;
    }

    if (!upstreamRes) {
      res.status(502).json({ error: "Upstream stream fetch failed" });
      return;
    }

    const contentType = upstreamRes.headers.get("content-type") || "";
    const isM3u8 =
      rawTargetUrl.includes(".m3u8") ||
      contentType.includes("mpegurl") ||
      contentType.includes("application/x-mpegURL");

    // Cache immutable static media chunks (.m4s, .ts, init.mp4) while keeping playlists dynamic
    const pathname = targetUrl.pathname.toLowerCase();
    const isStaticChunk =
      pathname.endsWith(".ts") ||
      pathname.endsWith(".m4s") ||
      pathname.endsWith("init.mp4") ||
      contentType.includes("video/mp2t") ||
      contentType.includes("video/iso.segment");

    if (isStaticChunk) {
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    } else {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    }

    if (isM3u8) {
      const text = await upstreamRes.text();
      const targetBase = rawTargetUrl.substring(0, rawTargetUrl.lastIndexOf("/") + 1);

      // Rewrite M3U8 lines so all child playlists, initialization segments, and media segments route through proxy
      const rewritten = text
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;

          // Rewrite #EXT-X-KEY:URI="url"
          if (trimmed.startsWith("#EXT-X-KEY:")) {
            return trimmed.replace(/URI="([^"]+)"/, (_, uri) => {
              const abs = uri.startsWith("http://") || uri.startsWith("https://")
                ? uri
                : new URL(uri, targetBase).toString();
              if (!isPrivateHost(abs)) {
                return `URI="/api/stream/proxy?token=${encodeURIComponent(createProxyDescriptor(abs, activeHeaders))}"`;
              }
              return `URI="${uri}"`;
            });
          }

          // Rewrite #EXT-X-MAP:URI="url" tags (used by fMP4 / HLS v6)
          if (trimmed.startsWith("#EXT-X-MAP:")) {
            return trimmed.replace(/URI="([^"]+)"/, (_, uri) => {
              const abs = uri.startsWith("http://") || uri.startsWith("https://")
                ? uri
                : new URL(uri, targetBase).toString();
              if (!isPrivateHost(abs)) {
                return `URI="/api/stream/proxy?token=${encodeURIComponent(createProxyDescriptor(abs, activeHeaders))}"`;
              }
              return `URI="${uri}"`;
            });
          }

          // Rewrite #EXT-X-MEDIA:URI="url" (alternative audio / subtitle renditions)
          if (trimmed.startsWith("#EXT-X-MEDIA:")) {
            return trimmed.replace(/URI="([^"]+)"/, (_, uri) => {
              const abs = uri.startsWith("http://") || uri.startsWith("https://")
                ? uri
                : new URL(uri, targetBase).toString();
              if (!isPrivateHost(abs)) {
                return `URI="/api/stream/proxy?token=${encodeURIComponent(createProxyDescriptor(abs, activeHeaders))}"`;
              }
              return `URI="${uri}"`;
            });
          }

          if (trimmed.startsWith("#")) {
            return line;
          }

          const absoluteUrl = trimmed.startsWith("http://") || trimmed.startsWith("https://")
            ? trimmed
            : new URL(trimmed, targetBase).toString();

          if (!isPrivateHost(absoluteUrl)) {
            return `/api/stream/proxy?token=${encodeURIComponent(createProxyDescriptor(absoluteUrl, activeHeaders))}`;
          }
          return line;
        })
        .join("\n");

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.status(upstreamRes.status).send(rewritten);
      return;
    }

    const isSrt =
      rawTargetUrl.includes(".srt") ||
      rawTargetUrl.includes("subtitles.vidy.st/download") ||
      rawTargetUrl.includes("subs.videasy.to/download") ||
      contentType.includes("x-subrip") ||
      contentType.includes("text/plain");

    if (isSrt) {
      let text = await upstreamRes.text();
      // Ensure WebVTT format for browser native HTML5 video <track>
      if (!text.trim().startsWith("WEBVTT")) {
        // Convert SRT commas in timestamps (00:01:20,000) to WebVTT dots (00:01:20.000)
        text = "WEBVTT\n\n" + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
      }
      res.setHeader("Content-Type", "text/vtt; charset=utf-8");
      res.status(upstreamRes.status).send(text);
      return;
    }

    // Binary / Video Segment Streaming
    if (upstreamRes.headers.has("content-type")) {
      res.setHeader("Content-Type", upstreamRes.headers.get("content-type")!);
    }
    if (upstreamRes.headers.has("content-length")) {
      res.setHeader("Content-Length", upstreamRes.headers.get("content-length")!);
    }
    if (upstreamRes.headers.has("content-range")) {
      res.setHeader("Content-Range", upstreamRes.headers.get("content-range")!);
    }
    if (upstreamRes.headers.has("accept-ranges")) {
      res.setHeader("Accept-Ranges", upstreamRes.headers.get("accept-ranges")!);
    }

    res.status(upstreamRes.status);

    if (upstreamRes.body) {
      try {
        const nodeStream = Readable.fromWeb(
          upstreamRes.body as unknown as WebReadableStream
        );
        await pipeline(nodeStream, res);
      } catch (streamErr: unknown) {
        const err = streamErr as { code?: string; name?: string };
        const isClientAbort =
          err?.code === "ERR_STREAM_PREMATURE_CLOSE" ||
          err?.code === "ECONNRESET" ||
          err?.code === "EPIPE" ||
          err?.name === "AbortError";
        if (!isClientAbort) {
          throw streamErr;
        }
      }
    } else if (!res.writableEnded && !res.destroyed) {
      res.end();
    }
    return;
  } catch {
    if (!res.headersSent) {
      res.status(502).json({ error: "Upstream stream fetch failed" });
    } else if (!res.writableEnded && !res.destroyed) {
      res.end();
    }
    return;
  }
});
