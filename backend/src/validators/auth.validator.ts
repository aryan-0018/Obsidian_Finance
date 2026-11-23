import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .min(1)
  .max(255);

export const registerPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");

export const loginPasswordSchema = z
  .string()
  .min(1, "Password is required")
  .max(128, "Password must be at most 128 characters");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  email: emailSchema,
  password: registerPasswordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export const googleLoginSchema = z.object({
  token: z.string().trim().min(1, "Google credential token is required"),
});

export type RegisterSchemaType = z.infer<typeof registerSchema>;
export type LoginSchemaType = z.infer<typeof loginSchema>;
export type GoogleLoginSchemaType = z.infer<typeof googleLoginSchema>;
