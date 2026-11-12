import { getImageMode, getImageProxyUrl, getTmdbImageBaseUrl } from "@/lib/env/public";

type TmdbImageSize =
  | "w92"
  | "w154"
  | "w185"
  | "w300"
  | "w342"
  | "w500"
  | "w780"
  | "w1280"
  | "original";

const STILL_THUMB_WIDTH = 640;
const WSRV_QUALITY = 75;
const DEFAULT_IMAGE_EXTENSION = "jpg";
const VECTOR_IMAGE_EXTENSION = "svg";

interface TmdbFile {
  name: string;
  extension: string;
}

// TMDB paths look like "/abc123.jpg"; logos may also be ".png" or ".svg".
function parseTmdbFile(path: string): TmdbFile {
  const file = path.replace(/^\/+/, "");
  const match = /^(.+)\.([A-Za-z0-9]+)$/.exec(file);

  return match
    ? { name: match[1], extension: match[2].toLowerCase() }
    : { name: file, extension: DEFAULT_IMAGE_EXTENSION };
}

// TMDB only serves vector logos at their original size.
function resolveSize(size: TmdbImageSize, extension: string): TmdbImageSize {
  return extension === VECTOR_IMAGE_EXTENSION ? "original" : size;
}

/**
 * Direct TMDB CDN URL. Use where the consumer needs the original JPEG/PNG,
 * such as Open Graph tags and JSON-LD, which must not point at a derived format.
 */
export function buildSourceImageUrl(
  path: string | null | undefined,
  size: TmdbImageSize
): string | null {
  if (!path) {
    return null;
  }

  const { name, extension } = parseTmdbFile(path);

  return `${getTmdbImageBaseUrl()}/${resolveSize(size, extension)}/${name}.${extension}`;
}

/** The wsrv service takes the source URL as a query parameter and returns resized WebP. */
function buildWsrvUrl(sourceUrl: string, width?: number): string {
  const params = new URLSearchParams({ url: sourceUrl, output: "webp", q: String(WSRV_QUALITY), n: "-1" });

  if (width) {
    params.set("w", String(width));
  }

  return `${getImageProxyUrl()}/?${params.toString()}`;
}

/**
 * Image URL for the UI, shaped by the image mode (see getImageMode):
 * straight from TMDB, through the wsrv service, or through the assets Worker
 * (`/p/{size}/{name}.{sourceExtension}`, which outputs WebP).
 */
export function buildImageUrl(
  path: string | null | undefined,
  size: TmdbImageSize,
  options: { width?: number } = {}
): string | null {
  if (!path) {
    return null;
  }

  const mode = getImageMode();
  const sourceUrl = buildSourceImageUrl(path, size);
  const { name, extension } = parseTmdbFile(path);

  // Vector logos are already tiny; rasterizing them would only make them larger.
  if (mode === "tmdb" || (mode === "wsrv" && extension === VECTOR_IMAGE_EXTENSION)) {
    return sourceUrl;
  }

  if (mode === "wsrv") {
    return sourceUrl ? buildWsrvUrl(sourceUrl, options.width) : null;
  }

  const assetUrl = `${getImageProxyUrl()}/p/${resolveSize(size, extension)}/${name}.${extension}`;

  return options.width ? `${assetUrl}?w=${options.width}` : assetUrl;
}

export function getLogoUrl(path: string | null | undefined): string | null {
  return buildImageUrl(path, "w500");
}

export function getHeroBackdropUrl(path: string | null | undefined): string | null {
  return buildImageUrl(path, "w1280");
}

export function getProfileUrl(path: string | null | undefined): string | null {
  return buildImageUrl(path, "w185");
}

export function getStillThumbUrl(path: string | null | undefined): string | null {
  if (getImageMode() === "tmdb") {
    return buildImageUrl(path, "w300");
  }

  return buildImageUrl(path, "original", { width: STILL_THUMB_WIDTH });
}

export function getSeasonPosterThumbUrl(path: string | null | undefined): string | null {
  return buildImageUrl(path, "w154");
}

export interface PosterResponsiveUrls {
  mobile: string | null;
  desktop: string | null;
}

export function getPosterResponsiveUrls(
  path: string | null | undefined
): PosterResponsiveUrls {
  return {
    mobile: buildImageUrl(path, "w342"),
    // Poster cards are at most 200 px wide, so w500 is sharp on high-density screens; w780 was about twice the bytes.
    desktop: buildImageUrl(path, "w500"),
  };
}

export interface BackdropResponsiveUrls {
  mobile: string | null;
  tablet: string | null;
  desktop: string | null;
  desktopSrcSet: string | null;
}

export function getBackdropResponsiveUrls(
  path: string | null | undefined
): BackdropResponsiveUrls {
  const mobile = buildImageUrl(path, "w780");
  const tablet = buildImageUrl(path, "w1280");
  const desktop1280 = buildImageUrl(path, "w1280");
  const desktop1920 = buildImageUrl(path, "original", { width: 1920 });

  const desktopSrcSet = desktop1920 && desktop1280
    ? `${desktop1280} 1280w, ${desktop1920} 1920w`
    : desktop1280 ?? null;

  return {
    mobile,
    tablet,
    desktop: desktop1920 ?? desktop1280,
    desktopSrcSet,
  };
}