import { z } from "./schema";

export const revokeSessionSchema = z.object({
  sessionId: z.number().int().min(1).optional(),
  revokeOthers: z.boolean().optional(),
});
