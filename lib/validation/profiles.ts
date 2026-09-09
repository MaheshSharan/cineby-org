import { z } from "./schema";

export const createProfileSchema = z.object({
  name: z.string().min(1, "Profile name is required").max(40),
  avatarUrl: z.string().regex(/^\/avatar\/classic-(?:[1-9]|1\d|2\d|30)\.png$/, "Invalid avatar"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Profile name is required").max(40).optional(),
  avatarUrl: z.string().regex(/^\/avatar\/classic-(?:[1-9]|1\d|2\d|30)\.png$/, "Invalid avatar").optional(),
  pin: z.string().regex(/^\d{4,8}$/, "PIN must be 4 to 8 digits").optional(),
});
