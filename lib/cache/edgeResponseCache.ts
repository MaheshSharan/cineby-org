import { SESSION_COOKIE } from "../auth/session";
import { LOGGED_IN_COOKIE_NAME } from "../auth/loggedInFlag";

/**
 * Edge cache for anonymous GET responses, kept in the Worker.
 *
 * The Worker is the origin on a Workers Custom Domain, so Cache-Control and Cache Rules never stop a
 * request from reaching it. Without this layer every page view is rendered again, which is where most
 * of the CPU time goes. The Cache API stores whatever the app already marked `public` with an `s-maxage`,
 * so routes that opt out (`private`, `no-store`, Set-Cookie) are never stored.
 */

const EDGE_CACHE_HEADER = "x-edge-cache";
const S_MAXAGE_PATTERN = /(?:^|,)\s*s-maxage=(\d+)/i;
const KEY_PREFIX = "/__edge-cache";

export interface EdgeCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export interface BackgroundTasks {
  waitUntil(promise: Promise<unknown>): void;
}

/** Signed-in visitors are never served from, or stored in, the shared cache. */
export function isCacheableRequest(request: Request): boolean {
  if (request.method !== "GET") return false;
  if (request.headers.has("authorization") || request.headers.has("range")) return false;

  const cookie = request.headers.get("cookie") ?? "";
  return !cookie.includes(`${SESSION_COOKIE}=`) && !cookie.includes(`${LOGGED_IN_COOKIE_NAME}=`);
}

export function isCacheableResponse(response: Response): boolean {
  if (response.status !== 200 || response.headers.has("set-cookie")) return false;

  const cacheControl = response.headers.get("cache-control") ?? "";
  if (!/\bpublic\b/i.test(cacheControl)) return false;
  if (/\b(private|no-store|no-cache)\b/i.test(cacheControl)) return false;

  return Number(S_MAXAGE_PATTERN.exec(cacheControl)?.[1] ?? 0) > 0;
}

/**
 * The deployment id is part of the key so HTML from an older build, which points at old chunk files,
 * is never served after a deploy.
 */
export function buildEdgeCacheKey(request: Request, deploymentId: string): Request {
  const url = new URL(request.url);
  return new Request(`${url.origin}${KEY_PREFIX}/${encodeURIComponent(deploymentId)}${url.pathname}${url.search}`);
}

function withEdgeCacheStatus(response: Response, status: "HIT" | "MISS"): Response {
  const tagged = new Response(response.body, response);
  tagged.headers.set(EDGE_CACHE_HEADER, status);
  return tagged;
}

export async function serveWithEdgeCache(
  request: Request,
  deploymentId: string | undefined,
  cache: EdgeCache,
  tasks: BackgroundTasks,
  render: () => Promise<Response>
): Promise<Response> {
  if (!deploymentId || !isCacheableRequest(request)) {
    return render();
  }

  const key = buildEdgeCacheKey(request, deploymentId);
  const cached = await cache.match(key);
  if (cached) {
    return withEdgeCacheStatus(cached, "HIT");
  }

  const response = await render();
  if (!isCacheableResponse(response)) {
    return response;
  }

  tasks.waitUntil(cache.put(key, response.clone()));
  return withEdgeCacheStatus(response, "MISS");
}
