import { z } from "./schema";

export const addToWatchlistSchema = z.object({
  mediaType: z.enum(["movie", "tv"] as const),
  mediaId: z.number().int().min(1),
  title: z.string().min(1).max(200),
  posterPath: z.string().max(300).nullable().optional(),
  backdropPath: z.string().max(300).nullable().optional(),
});
