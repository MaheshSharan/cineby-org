/**
 * Cineby Dedicated Asset Proxy Worker (assets.cineby.group)
 *
 * Responsibilities:
 * 1. Safely proxy and optimize images via wsrv.nl backend without CNAME SSL cross-tenant blocks.
 * 2. Serve first-party URLs (https://assets.cineby.group/?url=... or /p/...)
 * 3. Enforce heavy Edge Caching (30 days immutable) so repeat requests hit Cloudflare Edge Cache directly.
 * 4. Normalize quality, width and output (see params.ts) so query strings cannot fragment the cache.
 */

import { buildCanonicalCacheUrl, parseImageRequest } from "./params";

export interface Env {}

export default {
  async fetch(request: Request, _env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Healthcheck
    if (url.pathname === "/health" || url.pathname === "/ping") {
      return new Response("OK", { status: 200 });
    }

    // Reject invalid requests before touching the cache or the upstream backend.
    const parsed = parseImageRequest(url);

    if (!parsed.ok) {
      return new Response(parsed.message, { status: parsed.status });
    }

    const { params } = parsed;

    // Check Cloudflare Edge Cache first
    const cache = caches.default;
    const cacheKey = new Request(buildCanonicalCacheUrl(url.origin, params), { method: "GET" });
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Fetch from wsrv.nl backend
    const backendUrl = new URL("https://wsrv.nl/");
    backendUrl.searchParams.set("url", params.targetUrl);
    backendUrl.searchParams.set("output", params.output);
    backendUrl.searchParams.set("q", String(params.quality));
    backendUrl.searchParams.set("n", "-1");
    if (params.width !== null) {
      backendUrl.searchParams.set("w", String(params.width));
    }

    const upstreamResponse = await fetch(backendUrl.toString(), {
      headers: {
        "User-Agent": "CinebyAssetsProxy/1.0",
        Accept: "image/webp,image/avif,image/*,*/*;q=0.8",
      },
    });

    if (!upstreamResponse.ok) {
      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: upstreamResponse.headers,
      });
    }

    // Build edge-cacheable response headers
    const headers = new Headers(upstreamResponse.headers);
    headers.set("Cache-Control", "public, max-age=2592000, s-maxage=2592000, immutable");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.delete("cf-ray");
    headers.delete("cf-cache-status");

    const response = new Response(upstreamResponse.body, {
      status: 200,
      headers,
    });

    // Store in Cloudflare Edge Cache
    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  },
};
