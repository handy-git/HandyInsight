import { z } from "zod";

export const companionsPlayersQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
  sort: z.enum(["name", "count", "level", "coins"]).default("count"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const companionsUuidSchema = z.string().trim().min(1).max(64);
