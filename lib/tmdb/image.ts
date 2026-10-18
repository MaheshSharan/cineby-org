import { getImageProxyUrl, getTmdbImageBaseUrl, isImageProxyEnabled } from "@/lib/env";

export function buildImageUrl(
  path: string | null | undefined,
  size:
    | "w92"
    | "w154"
    | "w185"
    | "w300"
    | "w342"
    | "w500"
    | "w780"
    | "w1280"
    | "original"
): string | null {
  if (!path) {
    return null;
  }

  const cleanFile = path.replace(/^\/+/, "").replace(/\.(jpg|jpeg|png)$/i, "");

  if (isImageProxyEnabled()) {
    return `${getImageProxyUrl()}/p/${size}/${cleanFile}.webp`;
  }

  return `${getTmdbImageBaseUrl()}/${size}/${cleanFile}.jpg`;
}

export function getLogoUrl(path: string | null | undefined): string | null {
  return buildImageUrl(path, "w500");
}

export function getHeroBackdropUrl(path: string | null | undefined): string | null {
  return buildImageUrl(path, "original");
}

export function getProfileUrl(path: string | null | undefined): string | null {
  return buildImageUrl(path, "w185");
}

export function getStillThumbUrl(path: string | null | undefined): string | null {
  if (!isImageProxyEnabled()) {
    return buildImageUrl(path, "w300");
  }

  // 640px still thumbnail using proxy with explicit width parameter
  if (!path) {
    return null;
  }
  const cleanFile = path.replace(/^\/+/, "").replace(/\.(jpg|jpeg|png)$/i, "");
  const tmdbUrl = `${getTmdbImageBaseUrl()}/original/${cleanFile}.jpg`;
  return `${getImageProxyUrl()}/?url=${encodeURIComponent(tmdbUrl)}&w=640&output=webp&q=75&n=-1`;
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