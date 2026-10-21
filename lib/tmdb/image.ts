import { getImageProxyUrl, getTmdbImageBaseUrl, isImageProxyEnabled } from "@/lib/env/public";

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

/**
 * Image URL for the UI. Served through the asset proxy when enabled
 * (`/p/{size}/{name}.{sourceExtension}`, the proxy outputs WebP), otherwise straight from TMDB.
 */
export function buildImageUrl(
  path: string | null | undefined,
  size: TmdbImageSize,
  options: { width?: number } = {}
): string | null {
  if (!path) {
    return null;
  }

  if (!isImageProxyEnabled()) {
    return buildSourceImageUrl(path, size);
  }

  const { name, extension } = parseTmdbFile(path);
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
  if (!isImageProxyEnabled()) {
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
    desktop: buildImageUrl(path, "w780"),
  };
}

export interface BackdropResponsiveUrls {
  mobile: string | null;
  desktop: string | null;
}

export function getBackdropResponsiveUrls(
  path: string | null | undefined
): BackdropResponsiveUrls {
  return {
    mobile: buildImageUrl(path, "w780"),
    desktop: buildImageUrl(path, "w1280"),
  };
}