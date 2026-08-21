import { z } from "zod";

export const companionsPlayersQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
});

export const companionsUuidSchema = z.string().trim().min(1).max(64);
