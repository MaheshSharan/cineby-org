/**
 * Cineby Dedicated Asset Proxy Worker (assets.cineby.group)
 *
 * Responsibilities:
 * 1. Safely proxy and optimize images via wsrv.nl backend without CNAME SSL cross-tenant blocks.
 * 2. Serve first-party URLs (https://assets.cineby.group/?url=... or /p/...)
 * 3. Enforce heavy Edge Caching (30 days immutable) so repeat requests hit Cloudflare Edge Cache directly.
 */

export interface Env {}

const ALLOWED_HOSTS = new Set([
  "image.tmdb.org",
  "cineby.group",
  "www.cineby.group",
  "lh3.googleusercontent.com",
]);

export default {
  async fetch(request: Request, _env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Healthcheck
    if (url.pathname === "/health" || url.pathname === "/ping") {
      return new Response("OK", { status: 200 });
    }

    // Check Cloudflare Edge Cache first
    const cache = caches.default;
    const cacheKey = new Request(request.url, { method: "GET" });
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Determine target image URL
    let targetImageUrl: string | null = null;
    let quality = "80";
    let output = "webp";
    let width: string | null = null;

    if (url.searchParams.has("url")) {
      targetImageUrl = url.searchParams.get("url");
      quality = url.searchParams.get("q") ?? "80";
      output = url.searchParams.get("output") ?? "webp";
      width = url.searchParams.get("w");
    } else {
      // Clean path pattern: /p/{size}/{hash}.webp -> https://image.tmdb.org/t/p/{size}/{hash}
      const match = url.pathname.match(/^\/p\/([^/]+)\/(.+)$/);
      if (match) {
        const size = match[1];
        const file = match[2];
        const cleanFile = file.replace(/\.(webp|jpg|jpeg|png)$/i, "");
        targetImageUrl = `https://image.tmdb.org/t/p/${size}/${cleanFile}.jpg`;
      }
    }

    if (!targetImageUrl) {
      return new Response("Missing target image URL", { status: 400 });
    }

    try {
      const parsed = new URL(targetImageUrl);
      if (!ALLOWED_HOSTS.has(parsed.hostname)) {
        return new Response("Target host not allowed", { status: 403 });
      }
    } catch {
      return new Response("Invalid image URL", { status: 400 });
    }

    // Fetch from wsrv.nl backend
    const backendUrl = new URL("https://wsrv.nl/");
    backendUrl.searchParams.set("url", targetImageUrl);
    backendUrl.searchParams.set("output", output);
    backendUrl.searchParams.set("q", quality);
    backendUrl.searchParams.set("n", "-1");
    if (width) {
      backendUrl.searchParams.set("w", width);
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
