import { z } from "zod";

export const trendRangeSchema = z.enum(["7d", "30d"]).default("7d");

export const rankingQuerySchema = z.object({
  scope: z.enum(["today", "week", "month", "total"]).default("today"),
  page: z.coerce.number().int().min(1).default(1),
});

export const playersQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
});

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

export const uuidSchema = z.string().trim().min(1).max(64);
