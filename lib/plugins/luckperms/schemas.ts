import { z } from "zod";

/** 权限组列表查询参数。 */
export const luckPermsGroupsQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
  sort: z
    .enum(["name", "members", "permissions"])
    .default("members"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

/** 玩家权限列表查询参数。 */
export const luckPermsPlayersQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
  sort: z
    .enum(["username", "primaryGroup", "directPermissions"])
    .default("primaryGroup"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

/** 组内成员查询参数。 */
export const luckPermsGroupMemberQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
});

/** 操作日志查询参数。 */
export const luckPermsLogsQuerySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
});

/** 权限组名（路径参数）。 */
export const groupNameSchema = z.string().trim().min(1).max(64);
