import { z } from "zod";

export const taskPlayersQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
});

export const taskUuidSchema = z.string().trim().min(1).max(64);
