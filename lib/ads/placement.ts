/**
 * Shared placement rules for third-party ad scripts.
 * Ads are never allowed on pages that play video.
 */

/** Returns true when the URL (path plus optional query string) is a video player page. */
export function isPlayerPath(url: string): boolean {
  const [rawPath, rawQuery = ""] = url.split("#")[0].split("?");
  const path = rawPath.replace(/\/+$/, "") || "/";

  if (path === "/watch" || path.startsWith("/watch/")) return true;
  // The player opens inside the title page itself, with no change to the URL.
  if (path.startsWith("/movie/") || path.startsWith("/tv/")) return true;
  // /sports itself is a listing; match pages live under it
  if (path.startsWith("/sports/")) return true;

  return new URLSearchParams(rawQuery).get("play") === "true";
}
