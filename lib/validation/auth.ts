import { z } from "./schema";

export const loginSchema = z.object({
  identifier: z.string().min(1, "Username or email is required").max(100),
  password: z.string().min(1, "Password is required").max(200),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Username or email must be at least 3 characters").max(60),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  displayName: z.string().max(60).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(200),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(200),
});
