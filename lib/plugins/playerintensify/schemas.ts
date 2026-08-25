import { z } from "zod";

export const intensifyRankingTypeSchema = z
  .enum(["attempts", "level"])
  .default("attempts");

export const intensifyPlayersQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
  sort: z
    .enum(["attempts", "succeed", "failure", "rate", "level", "name"])
    .default("attempts"),
  order: z.enum(["desc", "asc"]).default("desc"),
});

export const intensifyUuidSchema = z.string().trim().min(1).max(64);
