import { describe, it, expect } from "vitest";

import { fetchImage } from "@/workers/assets/fetchImage";
import { parseImageWorkerConfig } from "@/workers/assets/params";

const configResult = parseImageWorkerConfig({
  TMDB_IMAGE_BASE_URL: "https://image.tmdb.org/t/p",
  IMAGE_BACKEND_URL: "https://wsrv.nl",
  ALLOWED_IMAGE_HOSTS: "image.tmdb.org",
});

if (!configResult.ok) {
  throw new Error("Test image worker config is invalid");
}

const CONFIG = configResult.config;
const PARAMS = {
  targetUrl: "https://image.tmdb.org/t/p/w780/abc123.jpg",
  quality: 80,
  output: "webp" as const,
  width: null,
};

function image(type: string): Response {
  return new Response("bytes", { status: 200, headers: { "Content-Type": type } });
}

describe("fetchImage", () => {
  it("serves the resized image from wsrv.nl and caches it for 30 days", async () => {
    const calls: string[] = [];
    const { response, cacheable } = await fetchImage(PARAMS, CONFIG, async (url) => {
      calls.push(url);
      return image("image/webp");
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("https://wsrv.nl/?url=");
    expect(response.headers.get("X-Assets-Source")).toBe("wsrv");
    expect(response.headers.get("Cache-Control")).toContain("max-age=2592000");
    expect(cacheable).toBe(true);
  });

  it("falls back to the source file when wsrv.nl returns 403", async () => {
    const { response, cacheable } = await fetchImage(PARAMS, CONFIG, async (url) =>
      url.startsWith("https://wsrv.nl")
        ? new Response("error code: 1106", { status: 403 })
        : image("image/jpeg")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("X-Assets-Source")).toBe("tmdb-fallback");
    expect(response.headers.get("X-Assets-Wsrv-Status")).toBe("403");
    expect(response.headers.get("Cache-Control")).toContain("max-age=3600");
    expect(cacheable).toBe(true);
  });

  it("falls back when wsrv.nl is unreachable", async () => {
    const { response } = await fetchImage(PARAMS, CONFIG, async (url) => {
      if (url.startsWith("https://wsrv.nl")) throw new Error("connection reset");
      return image("image/jpeg");
    });

    expect(response.headers.get("X-Assets-Source")).toBe("tmdb-fallback");
    expect(response.headers.get("X-Assets-Wsrv-Status")).toBe("network-error");
  });

  it("reports both hops and is not cacheable when everything fails", async () => {
    const { response, cacheable } = await fetchImage(PARAMS, CONFIG, async (url) =>
      new Response("nope", { status: url.startsWith("https://wsrv.nl") ? 403 : 404 })
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("X-Assets-Source")).toBe("failed");
    expect(response.headers.get("X-Assets-Wsrv-Status")).toBe("403");
    expect(response.headers.get("X-Assets-Origin-Status")).toBe("404");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(cacheable).toBe(false);
  });

  it("returns 502 when the origin is unreachable too", async () => {
    const { response } = await fetchImage(PARAMS, CONFIG, async () => {
      throw new Error("down");
    });

    expect(response.status).toBe(502);
    expect(response.headers.get("X-Assets-Origin-Status")).toBe("network-error");
  });
});
