import { z } from "zod";

export const warpPlayersQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
  sort: z
    .enum(["name", "count", "displayed", "tp", "thermal", "lastCreate"])
    .default("lastCreate"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const warpListQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  type: z.string().trim().max(64).default(""),
  server: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
  sort: z
    .enum(["name", "owner", "price", "thermal", "tp", "createTime", "expirationTime"])
    .default("createTime"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const warpUuidSchema = z.string().trim().min(1).max(64);

export const warpIdSchema = z.coerce.number().int().min(1);
