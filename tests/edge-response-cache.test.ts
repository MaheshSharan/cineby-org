import { describe, it, expect, vi } from "vitest";
import {
  buildEdgeCacheKey,
  isCacheableRequest,
  isCacheableResponse,
  serveWithEdgeCache,
  type EdgeCache,
} from "@/lib/cache/edgeResponseCache";

const PUBLIC_CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400";

function createMemoryCache(): EdgeCache & { store: Map<string, Response> } {
  const store = new Map<string, Response>();
  return {
    store,
    async match(request) {
      return store.get(request.url)?.clone();
    },
    async put(request, response) {
      store.set(request.url, response);
    },
  };
}

function createTasks() {
  const pending: Promise<unknown>[] = [];
  return {
    pending,
    waitUntil(promise: Promise<unknown>) {
      pending.push(promise);
    },
  };
}

function htmlResponse(cacheControl: string = PUBLIC_CACHE_CONTROL, init: ResponseInit = {}): Response {
  return new Response("<html></html>", {
    ...init,
    headers: { "cache-control": cacheControl, ...(init.headers ?? {}) },
  });
}

describe("edge response cache eligibility", () => {
  it("caches anonymous GET requests only", () => {
    expect(isCacheableRequest(new Request("https://cineby.group/"))).toBe(true);
    expect(isCacheableRequest(new Request("https://cineby.group/", { method: "POST" }))).toBe(false);
    expect(
      isCacheableRequest(new Request("https://cineby.group/", { headers: { authorization: "Bearer x" } }))
    ).toBe(false);
    expect(isCacheableRequest(new Request("https://cineby.group/", { headers: { range: "bytes=0-9" } }))).toBe(false);
  });

  it("bypasses the cache for signed-in visitors", () => {
    const withSession = new Request("https://cineby.group/", { headers: { cookie: "a=1; cineby_session=abc" } });
    const withFlag = new Request("https://cineby.group/", { headers: { cookie: "cineby_logged_in=1" } });
    const withOtherCookie = new Request("https://cineby.group/", { headers: { cookie: "theme=dark" } });

    expect(isCacheableRequest(withSession)).toBe(false);
    expect(isCacheableRequest(withFlag)).toBe(false);
    expect(isCacheableRequest(withOtherCookie)).toBe(true);
  });

  it("stores static pages, which send an s-maxage without `public`", () => {
    expect(isCacheableResponse(htmlResponse("s-maxage=86400, stale-while-revalidate=31449600"))).toBe(true);
  });

  it("stores only 200 responses with an s-maxage, no cookie and no private or no-store directive", () => {
    expect(isCacheableResponse(htmlResponse())).toBe(true);
    expect(isCacheableResponse(htmlResponse(PUBLIC_CACHE_CONTROL, { status: 404 }))).toBe(false);
    expect(isCacheableResponse(htmlResponse("private, max-age=0, must-revalidate"))).toBe(false);
    expect(isCacheableResponse(htmlResponse("public, no-store"))).toBe(false);
    expect(isCacheableResponse(htmlResponse("public, max-age=60"))).toBe(false);
    expect(isCacheableResponse(htmlResponse("public, s-maxage=0"))).toBe(false);
    expect(isCacheableResponse(htmlResponse(PUBLIC_CACHE_CONTROL, { headers: { "set-cookie": "a=1" } }))).toBe(false);
    expect(isCacheableResponse(new Response("x"))).toBe(false);
  });
});

describe("edge cache key", () => {
  it("includes the deployment id and the query string", () => {
    const key = buildEdgeCacheKey(new Request("https://cineby.group/movie/603-the-matrix?play=true"), "v1");

    expect(key.url).toBe("https://cineby.group/__edge-cache/v1/movie/603-the-matrix?play=true");
  });

  it("differs between deployments so old HTML is not served after a deploy", () => {
    const request = new Request("https://cineby.group/");

    expect(buildEdgeCacheKey(request, "v1").url).not.toBe(buildEdgeCacheKey(request, "v2").url);
  });
});

describe("serveWithEdgeCache", () => {
  it("renders once, then serves the stored copy", async () => {
    const cache = createMemoryCache();
    const tasks = createTasks();
    const render = vi.fn(async () => htmlResponse());
    const request = new Request("https://cineby.group/");

    const first = await serveWithEdgeCache(request, "v1", cache, tasks, render);
    await Promise.all(tasks.pending);
    const second = await serveWithEdgeCache(request, "v1", cache, tasks, render);

    expect(first.headers.get("x-edge-cache")).toBe("MISS");
    expect(second.headers.get("x-edge-cache")).toBe("HIT");
    expect(await second.text()).toBe("<html></html>");
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("renders again after a new deployment", async () => {
    const cache = createMemoryCache();
    const tasks = createTasks();
    const render = vi.fn(async () => htmlResponse());
    const request = new Request("https://cineby.group/");

    await serveWithEdgeCache(request, "v1", cache, tasks, render);
    await Promise.all(tasks.pending);
    const afterDeploy = await serveWithEdgeCache(request, "v2", cache, tasks, render);

    expect(afterDeploy.headers.get("x-edge-cache")).toBe("MISS");
    expect(render).toHaveBeenCalledTimes(2);
  });

  it("never stores or serves signed-in requests", async () => {
    const cache = createMemoryCache();
    const tasks = createTasks();
    const render = vi.fn(async () => htmlResponse());
    const request = new Request("https://cineby.group/", { headers: { cookie: "cineby_session=abc" } });

    await serveWithEdgeCache(request, "v1", cache, tasks, render);
    await serveWithEdgeCache(request, "v1", cache, tasks, render);

    expect(render).toHaveBeenCalledTimes(2);
    expect(cache.store.size).toBe(0);
  });

  it("does not store private responses", async () => {
    const cache = createMemoryCache();
    const tasks = createTasks();
    const render = vi.fn(async () => htmlResponse("private, max-age=0, must-revalidate"));

    const response = await serveWithEdgeCache(new Request("https://cineby.group/watch/tv/1"), "v1", cache, tasks, render);

    expect(response.headers.get("x-edge-cache")).toBeNull();
    expect(cache.store.size).toBe(0);
  });

  it("passes everything through when the deployment id is unknown", async () => {
    const cache = createMemoryCache();
    const tasks = createTasks();
    const render = vi.fn(async () => htmlResponse());

    await serveWithEdgeCache(new Request("https://cineby.group/"), undefined, cache, tasks, render);

    expect(render).toHaveBeenCalledTimes(1);
    expect(cache.store.size).toBe(0);
  });
});
