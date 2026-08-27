import { z } from "zod";

export const mypetPlayersQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
  sort: z.enum(["name", "count", "exp", "spawned", "used"]).default("count"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const mypetUuidSchema = z.string().trim().min(1).max(64);
