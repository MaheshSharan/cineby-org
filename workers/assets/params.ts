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

/** Deployment configuration (workers/assets/wrangler.jsonc vars). Nothing here has a default. */
export interface ImageWorkerEnv {
  TMDB_IMAGE_BASE_URL?: string;
  IMAGE_BACKEND_URL?: string;
  ALLOWED_IMAGE_HOSTS?: string;
}

export interface ImageWorkerConfig {
  tmdbImageBaseUrl: string;
  imageBackendUrl: string;
  allowedHosts: ReadonlySet<string>;
}

export type ImageWorkerConfigResult =
  | { ok: true; config: ImageWorkerConfig }
  | { ok: false; missing: string[] };

const REQUIRED_ENV = ["TMDB_IMAGE_BASE_URL", "IMAGE_BACKEND_URL", "ALLOWED_IMAGE_HOSTS"] as const;

export function parseImageWorkerConfig(env: ImageWorkerEnv): ImageWorkerConfigResult {
  const missing = REQUIRED_ENV.filter((name) => !env[name]?.trim());

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  return {
    ok: true,
    config: {
      tmdbImageBaseUrl: (env.TMDB_IMAGE_BASE_URL as string).trim().replace(/\/+$/, ""),
      imageBackendUrl: (env.IMAGE_BACKEND_URL as string).trim().replace(/\/+$/, ""),
      allowedHosts: new Set(
        (env.ALLOWED_IMAGE_HOSTS as string)
          .split(",")
          .map((host) => host.trim().toLowerCase())
          .filter(Boolean)
      ),
    },
  };
}

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
const TMDB_PATH_PATTERN = /^\/p\/([^/]+)\/([A-Za-z0-9_-]+)(?:\.(webp|jpg|jpeg|png|svg))?$/i;

const SOURCE_EXTENSIONS = new Set(["png", "svg"]);
const DEFAULT_SOURCE_EXTENSION = "jpg";

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

/**
 * Maps `/p/{size}/{name}.{ext}` to the TMDB source file. The extension names the source format
 * (`png`/`svg` logos); anything else is a JPEG. Vector logos only exist at `original`.
 */
export function buildTmdbImageUrl(pathname: string, tmdbImageBaseUrl: string): string | null {
  const match = TMDB_PATH_PATTERN.exec(pathname);

  if (!match) {
    return null;
  }

  const [, requestedSize, name, extension = ""] = match;
  const sourceExtension = SOURCE_EXTENSIONS.has(extension.toLowerCase())
    ? extension.toLowerCase()
    : DEFAULT_SOURCE_EXTENSION;
  const size = sourceExtension === "svg" ? "original" : requestedSize;

  return TMDB_IMAGE_SIZES.has(size)
    ? `${tmdbImageBaseUrl}/${size}/${name}.${sourceExtension}`
    : null;
}

function reject(status: 400 | 403, message: string): ImageRequestResult {
  return { ok: false, status, message };
}

export function parseImageRequest(url: URL, config: ImageWorkerConfig): ImageRequestResult {
  const rawTargetUrl =
    url.searchParams.get("url") ?? buildTmdbImageUrl(url.pathname, config.tmdbImageBaseUrl);

  if (!rawTargetUrl) {
    return reject(400, "Missing target image URL");
  }

  let target: URL;
  try {
    target = new URL(rawTargetUrl);
  } catch {
    return reject(400, "Invalid image URL");
  }

  if (!config.allowedHosts.has(target.hostname)) {
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
