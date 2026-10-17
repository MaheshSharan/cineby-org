// Canonical production origin. robots.txt and sitemap.xml are static files and repeat this value;
// tests/seo.test.ts fails if they drift from it.
export const SITE_URL = "https://cineby.group";

export const SITE_NAME = "Cineby";

export const DEFAULT_OG_IMAGE_PATH = "/screenshots/home-wide.png";

export function buildAbsoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
