import { z } from "zod";

export const taskPlayersQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
  sort: z
    .enum(["name", "coins", "daily", "npc", "reel", "lastTask"])
    .default("lastTask"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const taskUuidSchema = z.string().trim().min(1).max(64);
