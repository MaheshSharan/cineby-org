/**
 * BlobPool: Centralized lifecycle management for in-memory playlist Blobs.
 *
 * Prevents memory leaks by tracking all created Blob URLs and revoking them
 * when streams change, episodes advance, or the player unmounts.
 *
 * Also normalizes relative playlist URLs (e.g. /api/stream/proxy) into absolute
 * URLs using window.location.origin, preventing browsers from incorrectly resolving
 * them against blob: base URLs.
 */

const activeBlobs = new Set<string>();

/**
 * Normalizes all root-relative paths in an M3U8 manifest to absolute HTTP(S) URLs
 * based on the current browser origin, ensuring HLS.js does not resolve them
 * relative to the playlist's blob: URI.
 */
export function normalizePlaylistUrls(m3u8Text: string): string {
  if (typeof window === "undefined") {
    return m3u8Text;
  }

  const origin = window.location.origin;

  // Replace root-relative URIs in attributes (URI="/api/...") or standalone segment/variant lines (/api/...)
  return m3u8Text.replace(
    /(URI=["'])(\/[^"'\r\n]+)(["'])|^(\/[^\r\n]+)/gm,
    (_match, p1, p2, p3, p4) => {
      if (p4) {
        return `${origin}${p4}`;
      }
      return `${p1}${origin}${p2}${p3}`;
    }
  );
}

/**
 * Creates an in-memory M3U8 Blob URL with normalized absolute paths
 * and tracks it in the pool for automatic memory cleanup.
 */
export function createPlaylistBlob(m3u8Text: string): string {
  if (typeof window === "undefined") {
    return "";
  }

  const normalized = normalizePlaylistUrls(m3u8Text);
  const blob = new Blob([normalized], { type: "application/vnd.apple.mpegurl" });
  const url = URL.createObjectURL(blob);
  activeBlobs.add(url);
  return url;
}

/**
 * Safely revokes a specific Blob URL from browser memory and removes it from the pool.
 */
export function revokeBlob(url?: string | null): void {
  if (!url || typeof window === "undefined" || !url.startsWith("blob:")) {
    return;
  }

  try {
    URL.revokeObjectURL(url);
  } catch {
    // Ignore any revocation errors
  }
  activeBlobs.delete(url);
}

/**
 * Revokes all active Blob URLs in the pool and clears tracking.
 * Call when changing streams, hopping servers, skipping episodes, or unmounting.
 */
export function revokeAllBlobs(): void {
  if (typeof window === "undefined") {
    return;
  }

  for (const url of activeBlobs) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore
    }
  }
  activeBlobs.clear();
}
