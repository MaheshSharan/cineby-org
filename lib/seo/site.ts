import { getSiteUrl } from "@/lib/env/public";

export const SITE_NAME = "Cineby";

export const SOCIAL_PROFILE_URLS: readonly string[] = ["https://x.com/Cineby_groups"];

export const DEFAULT_OG_IMAGE_PATH = "/screenshots/home-wide.png";

export function getSiteHost(): string {
  return new URL(getSiteUrl()).hostname;
}

export function buildAbsoluteUrl(path: string): string {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
