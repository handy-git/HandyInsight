import { z } from "zod";

export const currencyPlayersQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
});

export const currencyLogsQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  type: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
});

export const currencyUuidSchema = z.string().trim().min(1).max(64);
