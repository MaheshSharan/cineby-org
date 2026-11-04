import { z } from "./schema";

export const addHistorySchema = z.object({
  mediaType: z.enum(["movie", "tv"] as const),
  mediaId: z.number().int().min(1),
  title: z.string().min(1).max(200),
  posterPath: z.string().max(300).nullable().optional(),
  backdropPath: z.string().max(300).nullable().optional(),
  seasonNumber: z.number().int().min(1).nullable().optional(),
  episodeNumber: z.number().int().min(1).nullable().optional(),
  duration: z.string().max(50).nullable().optional(),
  progress: z.number().min(0).max(100).nullable().optional(),
  progressSeconds: z.number().min(0).nullable().optional(),
});

export type AddHistoryData = ReturnType<typeof addHistorySchema.parseValue>;

export const MAX_HISTORY_BATCH_ITEMS = 20;

export interface HistoryBatch {
  items: AddHistoryData[];
  skipped: number;
}

/**
 * Parses a guest-history merge request. Invalid entries are skipped instead of failing the whole
 * request, so one stale local entry can never block the rest from syncing.
 * Items are expected newest first: when a title appears more than once, the first entry wins.
 */
export function parseHistoryBatch(body: unknown): HistoryBatch | null {
  const rawItems: unknown = typeof body === "object" && body !== null ? Reflect.get(body, "items") : undefined;

  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > MAX_HISTORY_BATCH_ITEMS) {
    return null;
  }

  const candidates: unknown[] = rawItems;
  const seenTitles = new Set<string>();
  const items: AddHistoryData[] = [];
  let skipped = 0;

  for (const rawItem of candidates) {
    const result = addHistorySchema.safeParse(rawItem);
    if (!result.success) {
      skipped += 1;
      continue;
    }

    const titleKey = `${result.data.mediaType}:${result.data.mediaId}`;
    if (seenTitles.has(titleKey)) {
      skipped += 1;
      continue;
    }

    seenTitles.add(titleKey);
    items.push(result.data);
  }

  return { items, skipped };
}
