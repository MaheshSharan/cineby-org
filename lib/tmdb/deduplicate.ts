import type { MediaSummary } from "./types";

export function getMediaKey(item: MediaSummary): string {
  const type = item.mediaType || "movie";
  return `${type}:${item.id}`;
}

/**
 * Filters a pool of media items against a Set of already seen media keys.
 * Mutates seenKeys by adding newly accepted items, and stops once limit is reached.
 */
export function deduplicateMediaPool(
  items: MediaSummary[],
  seenKeys: Set<string>,
  limit?: number
): MediaSummary[] {
  const result: MediaSummary[] = [];

  for (const item of items) {
    const key = getMediaKey(item);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      result.push(item);
      if (typeof limit === "number" && result.length >= limit) {
        break;
      }
    }
  }

  return result;
}
