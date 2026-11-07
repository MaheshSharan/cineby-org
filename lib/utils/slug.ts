import type { Redirect } from "next";

/**
 * Converts a title into a URL-friendly slug.
 * e.g., "Iron Man 2" -> "iron-man-2"
 */
export function slugify(text?: string | null): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, "-and-")
    .replace(/[^\w\s-]/g, "") // remove non-alphanumeric chars
    .replace(/[\s_-]+/g, "-") // collapse dashes and spaces
    .replace(/^-+|-+$/g, ""); // trim leading/trailing dashes
}

/**
 * Returns a permanent redirect when a media URL is not in its canonical slug form
 * (e.g. "/movie/603" or "/movie/603-wrong-slug" -> "/movie/603-the-matrix"), keeping the query string.
 * Google otherwise indexes both forms and may pick the wrong one as canonical.
 */
export function getCanonicalSlugRedirect(
  requestedPath: string,
  canonicalPath: string,
  resolvedUrl: string
): Redirect | null {
  if (requestedPath === canonicalPath) return null;

  const queryStart = resolvedUrl.indexOf("?");
  const search = queryStart === -1 ? "" : resolvedUrl.slice(queryStart);

  return { destination: `${canonicalPath}${search}`, permanent: true };
}

/**
 * Extracts the numeric ID from a slugged or unslugged parameter.
 * Handles both "1726-iron-man" and "1726"
 */
export function extractIdFromSlug(param?: string | null): string | null {
  if (!param) return null;
  const match = param.match(/^(\d+)/);
  return match ? match[1] : null;
}
