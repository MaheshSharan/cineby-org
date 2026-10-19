import { getSiteUrl } from "@/lib/env/public";

export const SITE_NAME = "Cineby";

export const DEFAULT_OG_IMAGE_PATH = "/screenshots/home-wide.png";

export function buildAbsoluteUrl(path: string): string {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
