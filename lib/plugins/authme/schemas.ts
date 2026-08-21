import { z } from "zod";

export const authmeTrendRangeSchema = z.enum(["7d", "30d"]).default("7d");

export const authmePlayersQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
});

export const authmeUsernameSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_]+$/, "用户名只能是字母、数字或下划线");
