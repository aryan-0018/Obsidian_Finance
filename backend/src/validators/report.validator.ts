import { z } from "zod";
import { objectIdSchema } from "./transaction.validator";

export const reportSettingSchema = z.object({
  isEnabled: z.boolean().default(true),
});

export const updateReportSettingSchema = reportSettingSchema.partial();

export const reportPaginationQuerySchema = z.object({
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  pageNumber: z.coerce.number().int().min(1).max(10000).default(1),
});

export const generateReportQuerySchema = z
  .object({
    from: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid 'from' date"),
    to: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid 'to' date"),
  })
  .refine((v) => new Date(v.from) <= new Date(v.to), {
    message: "'from' date must be on or before 'to' date",
  });

export const instantReportBodySchema = z
  .object({
    from: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid 'from' date")
      .optional(),
    to: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid 'to' date")
      .optional(),
    sendEmail: z.union([z.boolean(), z.enum(["true", "false"])]).optional(),
  })
  .refine(
    (v) => !(v.from && v.to) || new Date(v.from) <= new Date(v.to),
    { message: "'from' date must be on or before 'to' date" }
  );

export const reportIdParamSchema = objectIdSchema;

export type UpdateReportSettingType = z.infer<typeof updateReportSettingSchema>;
