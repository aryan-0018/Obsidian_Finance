import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  portfolioBalance: z.coerce
    .number()
    .finite("Portfolio balance must be a valid number")
    .min(-1_000_000_000_000)
    .max(1_000_000_000_000)
    .optional(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code")
    .optional(),
});

export type UpdateUserType = z.infer<typeof updateUserSchema>;
