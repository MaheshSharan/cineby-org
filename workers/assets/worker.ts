/**
 * Cineby Dedicated Asset Proxy Worker (assets.cineby.group)
 *
 * Responsibilities:
 * 1. Safely proxy and optimize images via wsrv.nl backend without CNAME SSL cross-tenant blocks.
 * 2. Serve first-party URLs (https://assets.cineby.group/?url=... or /p/...)
 * 3. Enforce heavy Edge Caching (30 days immutable) so repeat requests hit Cloudflare Edge Cache directly.
 * 4. Fall back to the source image when wsrv.nl fails (see fetchImage.ts).
 * 5. Normalize quality, width and output (see params.ts) so query strings cannot fragment the cache.
 */

import { fetchImage } from "./fetchImage";
import {
  buildCanonicalCacheUrl,
  parseImageRequest,
  parseImageWorkerConfig,
  type ImageWorkerEnv,
} from "./params";

export type Env = ImageWorkerEnv;

// Minimal Workers runtime types, matching workers/stream-proxy (no @cloudflare/workers-types dependency).
interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface WorkerCacheStorage extends CacheStorage {
  default: Cache;
}

export default {
  async fetch(request: Request, env: Env, ctx: WorkerContext): Promise<Response> {
    const url = new URL(request.url);

    // Healthcheck
    if (url.pathname === "/health" || url.pathname === "/ping") {
      return new Response("OK", { status: 200 });
    }

    // No defaults: a worker without its configuration refuses to serve.
    const configResult = parseImageWorkerConfig(env);

    if (!configResult.ok) {
      return new Response(
        `Server Misconfiguration: missing required variable(s) ${configResult.missing.join(", ")}`,
        { status: 500 }
      );
    }

    // Reject invalid requests before touching the cache or the upstream backend.
    const parsed = parseImageRequest(url, configResult.config);

    if (!parsed.ok) {
      return new Response(parsed.message, {
        status: parsed.status,
        headers: { "X-Assets-Source": "worker-rejected" },
      });
    }

    const { params } = parsed;

    // Check Cloudflare Edge Cache first
    const cache = (caches as WorkerCacheStorage).default;
    const cacheKey = new Request(buildCanonicalCacheUrl(url.origin, params), { method: "GET" });
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      return cachedResponse;
    }

    const { response, cacheable } = await fetchImage(params, configResult.config);

    // Only successful images are stored; failures must be retried on the next request.
    if (cacheable) {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  },
};
