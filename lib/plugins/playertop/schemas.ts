import { z } from "zod";

export const topRankingQuerySchema = z.object({
  papi: z.string().trim().min(1).max(64),
  page: z.coerce.number().int().min(1).default(1),
});

export const topLogsQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  papi: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
  sort: z
    .enum(["name", "papi", "rank", "type", "status", "time"])
    .default("time"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const topUuidSchema = z.string().trim().min(1).max(64);
