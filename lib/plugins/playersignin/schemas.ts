import { z } from "zod";

export const signInTrendRangeSchema = z.enum(["7d", "30d"]).default("7d");

export const signInPlayersQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
});

export const signInPageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const signInUuidSchema = z.string().trim().min(1).max(64);
