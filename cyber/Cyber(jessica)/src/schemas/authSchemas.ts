import { z } from "zod";

export const loginSchema = z.object({
  username_or_email: z.string().min(1, "Username or email is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(["system_admin", "analyst", "end_user"]),
});