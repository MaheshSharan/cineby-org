// Sports thumbnails come from a third-party feed. These hosts no longer resolve (DNS answers NXDOMAIN), so a
// card that points at them can only fail to load, log a console error and then vanish from the row.
const UNREACHABLE_POSTER_HOSTS: ReadonlySet<string> = new Set(["thumbs.poocloud.in"]);

/** The poster URL when it can be loaded, otherwise null. Relative paths are same-origin and always usable. */
export function getUsablePosterUrl(poster: string | null | undefined): string | null {
  const trimmed = poster?.trim();
  if (!trimmed) return null;

  try {
    return UNREACHABLE_POSTER_HOSTS.has(new URL(trimmed).hostname) ? null : trimmed;
  } catch {
    // Not an absolute URL, so it is a path on our own origin.
    return trimmed;
  }
}
