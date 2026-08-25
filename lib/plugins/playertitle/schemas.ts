import { z } from "zod";

export const titlePlayersQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
  sort: z.enum(["name", "count", "coins"]).default("count"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const titleListQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
  sort: z.enum(["name", "price", "day", "position"]).default("position"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export const titleUuidSchema = z.string().trim().min(1).max(64);
