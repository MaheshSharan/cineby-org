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
 * Extracts the numeric ID from a slugged or unslugged parameter.
 * Handles both "1726-iron-man" and "1726"
 */
export function extractIdFromSlug(param?: string | null): string | null {
  if (!param) return null;
  const match = param.match(/^(\d+)/);
  return match ? match[1] : null;
}
