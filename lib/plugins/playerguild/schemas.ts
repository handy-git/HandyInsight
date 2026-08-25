import { z } from "zod";

export const guildListQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
  sort: z
    .enum([
      "name",
      "level",
      "members",
      "money",
      "prosperity",
      "monthProsperity",
      "createTime",
    ])
    .default("members"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const guildMemberQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
  sort: z
    .enum([
      "name",
      "role",
      "money",
      "weekMoney",
      "totalMoney",
      "ore",
      "kill",
      "lastJoin",
    ])
    .default("totalMoney"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const guildIdSchema = z.coerce.number().int().min(1);
