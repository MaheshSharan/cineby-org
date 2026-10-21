// Fetches an image for the assets worker: resized WebP through wsrv.nl first, then the source
// file straight from its origin when wsrv.nl fails, so a throttled or blocked backend never
// leaves a broken image. Every response says which hop served it (X-Assets-* headers).

import type { ImageRequestParams, ImageWorkerConfig } from "./params";

export const SUCCESS_CACHE_SECONDS = 30 * 24 * 60 * 60;
// Fallback files are not resized, so cache them briefly and let wsrv.nl take over again.
export const FALLBACK_CACHE_SECONDS = 60 * 60;

const SOURCE_HEADER = "X-Assets-Source";
const BACKEND_STATUS_HEADER = "X-Assets-Wsrv-Status";
const ORIGIN_STATUS_HEADER = "X-Assets-Origin-Status";
const NETWORK_ERROR = "network-error";

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export interface ImageFetchOutcome {
  response: Response;
  /** False for failures, which must never be stored in the edge cache. */
  cacheable: boolean;
}

const REQUEST_HEADERS = {
  "User-Agent": "CinebyAssetsProxy/1.0",
  Accept: "image/webp,image/avif,image/*,*/*;q=0.8",
};

function buildBackendUrl(params: ImageRequestParams, config: ImageWorkerConfig): string {
  const backendUrl = new URL(`${config.imageBackendUrl}/`);

  backendUrl.searchParams.set("url", params.targetUrl);
  backendUrl.searchParams.set("output", params.output);
  backendUrl.searchParams.set("q", String(params.quality));
  backendUrl.searchParams.set("n", "-1");

  if (params.width !== null) {
    backendUrl.searchParams.set("w", String(params.width));
  }

  return backendUrl.toString();
}

/** A network error is a failed hop like any other, so it resolves to null instead of throwing. */
async function tryFetch(fetcher: Fetcher, url: string): Promise<Response | null> {
  try {
    return await fetcher(url, { headers: REQUEST_HEADERS });
  } catch {
    return null;
  }
}

function successResponse(
  upstream: Response,
  source: "wsrv" | "tmdb-fallback",
  cacheSeconds: number,
  backendStatus?: string
): Response {
  const headers = new Headers(upstream.headers);

  headers.set("Cache-Control", `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}, immutable`);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Expose-Headers", `${SOURCE_HEADER}, ${BACKEND_STATUS_HEADER}`);
  headers.set(SOURCE_HEADER, source);
  headers.delete("cf-ray");
  headers.delete("cf-cache-status");

  if (backendStatus) {
    headers.set(BACKEND_STATUS_HEADER, backendStatus);
  }

  return new Response(upstream.body, { status: 200, headers });
}

function failureResponse(backendStatus: string, origin: Response | null): Response {
  return new Response("Image unavailable", {
    status: origin?.status ?? 502,
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      [SOURCE_HEADER]: "failed",
      [BACKEND_STATUS_HEADER]: backendStatus,
      [ORIGIN_STATUS_HEADER]: origin ? String(origin.status) : NETWORK_ERROR,
    },
  });
}

export async function fetchImage(
  params: ImageRequestParams,
  config: ImageWorkerConfig,
  fetcher: Fetcher = fetch
): Promise<ImageFetchOutcome> {
  const backend = await tryFetch(fetcher, buildBackendUrl(params, config));

  if (backend?.ok) {
    return { response: successResponse(backend, "wsrv", SUCCESS_CACHE_SECONDS), cacheable: true };
  }

  const backendStatus = backend ? String(backend.status) : NETWORK_ERROR;
  // Release the failed response's connection before opening the next one.
  await backend?.body?.cancel();

  const origin = await tryFetch(fetcher, params.targetUrl);

  if (origin?.ok) {
    return {
      response: successResponse(origin, "tmdb-fallback", FALLBACK_CACHE_SECONDS, backendStatus),
      cacheable: true,
    };
  }

  await origin?.body?.cancel();
  return { response: failureResponse(backendStatus, origin), cacheable: false };
}
