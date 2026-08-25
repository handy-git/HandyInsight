import { z } from "zod";

export const currencyPlayersQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
  sort: z
    .enum(["name", "types", "balance", "lastChange"])
    .default("balance"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const currencyLogsQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  type: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
  sort: z
    .enum(["name", "type", "oldBalance", "change", "balance", "time"])
    .default("time"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const currencyUuidSchema = z.string().trim().min(1).max(64);
