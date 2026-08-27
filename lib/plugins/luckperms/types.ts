/** LuckPerms 权限插件共享类型。 */

import type { SortOrder } from "@/lib/common/sort";

/** 权限组列表可排序字段。 */
export type LuckPermsGroupSortField = "name" | "members" | "permissions";

/** 权限组列表各排序字段首次点击时的默认方向（文本类升序，数值类降序）。 */
export const LUCKPERMS_GROUP_DEFAULT_ORDER: Record<
  LuckPermsGroupSortField,
  SortOrder
> = {
  name: "asc",
  members: "desc",
  permissions: "desc",
};

/** 玩家权限列表可排序字段。 */
export type LuckPermsPlayerSortField =
  | "username"
  | "primaryGroup"
  | "directPermissions";

/** 玩家权限列表各排序字段首次点击时的默认方向。 */
export const LUCKPERMS_PLAYER_DEFAULT_ORDER: Record<
  LuckPermsPlayerSortField,
  SortOrder
> = {
  username: "asc",
  primaryGroup: "asc",
  directPermissions: "desc",
};

/** 权限条目（组权限 / 玩家权限通用）。 */
export interface LuckPermsPermissionEntry {
  permission: string;
  /** true 允许 / false 拒绝 */
  value: boolean;
  server: string | null;
  world: string | null;
  /** 过期时间 yyyy-MM-dd HH:mm:ss；永久为 null */
  expiry: string | null;
  contexts: string | null;
}

/** 权限组列表条目。 */
export interface LuckPermsGroupItem {
  name: string;
  /** 组内玩家数（luckperms_players 聚合） */
  memberCount: number;
  /** 组权限数（luckperms_group_permissions） */
  permissionCount: number;
}

/** 权限组详情（权限列表；成员走独立分页接口）。 */
export interface LuckPermsGroupDetail extends LuckPermsGroupItem {
  permissions: LuckPermsPermissionEntry[];
}

/** 权限组内成员条目。 */
export interface LuckPermsGroupMember {
  uuid: string;
  username: string;
}

/** 玩家权限条目（玩家列表行）。 */
export interface LuckPermsPlayerItem {
  uuid: string;
  username: string;
  primaryGroup: string;
  /** 直接权限数（luckperms_user_permissions），缺表为 null */
  directPermissionCount: number | null;
}

/** 操作日志条目（luckperms_actions）。 */
export interface LuckPermsActionEntry {
  id: number;
  /** yyyy-MM-dd HH:mm:ss */
  time: string;
  actorName: string | null;
  /** 操作对象类型标签（u 玩家 / g 权限组 / t 轨道），未知显示原文 */
  type: string;
  actedName: string | null;
  action: string;
}

/** 总览统计。 */
export interface LuckPermsOverview {
  /** 有权限记录的玩家数 */
  totalPlayers: number;
  /** 已分配玩家的权限组数（primary_group 去重） */
  totalGroups: number;
  /** 组权限总数 */
  totalGroupPermissions: number;
  /** 持有直接权限的玩家数（缺表为 null） */
  totalDirectPlayers: number | null;
  /** 操作总数（缺表为 null） */
  totalActions: number | null;
  /** 组人数分布 Top10 */
  groupDistribution: { name: string; memberCount: number }[];
  /** 权限数 Top10 组 */
  topPermissionGroups: { name: string; count: number }[];
  /** 最近操作（缺表为 null） */
  recentActions: LuckPermsActionEntry[] | null;
}

/** 操作日志统计（缺表不进入本页）。 */
export interface LuckPermsLogStats {
  total: number;
  /** 操作类型分布 */
  typeDistribution: { type: string; count: number }[];
  /** 近 30 天操作趋势（按天补零） */
  trend: { date: string; count: number }[];
}

/** 日志页数据：统计 + 分页列表一次返回。 */
export interface LuckPermsLogPage {
  stats: LuckPermsLogStats;
  items: LuckPermsActionEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/** 全服玩家详情用的轻量摘要。 */
export interface LuckPermsPlayerSummary {
  primaryGroup: string;
  /** 直接权限数，缺表为 null */
  directPermissionCount: number | null;
}
