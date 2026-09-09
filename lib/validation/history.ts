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
