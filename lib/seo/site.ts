const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
if (!rawSiteUrl) {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_SITE_URL");
}

export const SITE_URL = rawSiteUrl.replace(/\/+$/, "");

export const SITE_NAME = "Cineby";

export const DEFAULT_OG_IMAGE_PATH = "/screenshots/home-wide.png";

export function buildAbsoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
