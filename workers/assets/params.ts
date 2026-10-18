// Request validation for the assets worker. Every value that reaches the edge cache key or
// wsrv.nl is normalized here, so arbitrary query strings cannot fragment the cache or burn CPU.

export type ImageOutput = "webp" | "avif";

export interface ImageRequestParams {
  targetUrl: string;
  quality: number;
  output: ImageOutput;
  width: number | null;
}

export type ImageRequestResult =
  | { ok: true; params: ImageRequestParams }
  | { ok: false; status: 400 | 403; message: string };

const ALLOWED_HOSTS = new Set([
  "image.tmdb.org",
  "cineby.group",
  "www.cineby.group",
  "lh3.googleusercontent.com",
]);

const TMDB_IMAGE_SIZES = new Set([
  "w92",
  "w154",
  "w185",
  "w300",
  "w342",
  "w500",
  "w780",
  "w1280",
  "original",
]);

// TMDB file names are URL-safe hashes; anything else could escape the /t/p/{size}/ path.
const TMDB_PATH_PATTERN = /^\/p\/([^/]+)\/([A-Za-z0-9_-]+)(?:\.(?:webp|jpg|jpeg|png))?$/i;

const DEFAULT_OUTPUT: ImageOutput = "webp";

const DEFAULT_QUALITY = 80;
const MIN_QUALITY = 30;
const MAX_QUALITY = 90;
const QUALITY_STEP = 5;

// TMDB's own sizes plus the 640px still thumbnail used by the app.
const WIDTH_BUCKETS = [92, 154, 185, 300, 342, 500, 640, 780, 1280, 1920] as const;
const MAX_WIDTH = WIDTH_BUCKETS[WIDTH_BUCKETS.length - 1];

function isImageOutput(value: string): value is ImageOutput {
  return value === "webp" || value === "avif";
}

/** Returns null for an unsupported format so the caller can reject the request. */
export function normalizeOutput(raw: string | null): ImageOutput | null {
  if (raw === null) {
    return DEFAULT_OUTPUT;
  }

  return isImageOutput(raw) ? raw : null;
}

export function normalizeQuality(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? "", 10);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_QUALITY;
  }

  const clamped = Math.min(MAX_QUALITY, Math.max(MIN_QUALITY, parsed));

  return Math.round(clamped / QUALITY_STEP) * QUALITY_STEP;
}

/** Rounds up to the next bucket so images are never upscaled from a smaller size. */
export function normalizeWidth(raw: string | null): number | null {
  const parsed = Number.parseInt(raw ?? "", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return WIDTH_BUCKETS.find((bucket) => bucket >= parsed) ?? MAX_WIDTH;
}

export function buildTmdbImageUrl(pathname: string): string | null {
  const match = TMDB_PATH_PATTERN.exec(pathname);

  if (!match) {
    return null;
  }

  const [, size, file] = match;

  return TMDB_IMAGE_SIZES.has(size) ? `https://image.tmdb.org/t/p/${size}/${file}.jpg` : null;
}

function reject(status: 400 | 403, message: string): ImageRequestResult {
  return { ok: false, status, message };
}

export function parseImageRequest(url: URL): ImageRequestResult {
  const rawTargetUrl = url.searchParams.get("url") ?? buildTmdbImageUrl(url.pathname);

  if (!rawTargetUrl) {
    return reject(400, "Missing target image URL");
  }

  let target: URL;
  try {
    target = new URL(rawTargetUrl);
  } catch {
    return reject(400, "Invalid image URL");
  }

  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return reject(403, "Target host not allowed");
  }

  const output = normalizeOutput(url.searchParams.get("output"));

  if (!output) {
    return reject(400, "Unsupported output format");
  }

  return {
    ok: true,
    params: {
      targetUrl: target.href,
      quality: normalizeQuality(url.searchParams.get("q")),
      output,
      width: normalizeWidth(url.searchParams.get("w")),
    },
  };
}

/**
 * Cache key built only from normalized values. Keying on the raw request URL would let `?q=1`,
 * `?q=2` or any junk parameter create a separate cache entry for the same image.
 */
export function buildCanonicalCacheUrl(origin: string, params: ImageRequestParams): string {
  const key = new URL("/", origin);

  key.searchParams.set("url", params.targetUrl);
  key.searchParams.set("q", String(params.quality));
  key.searchParams.set("output", params.output);

  if (params.width !== null) {
    key.searchParams.set("w", String(params.width));
  }

  return key.toString();
}
