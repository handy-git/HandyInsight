/** PlayerGuild 插件共享类型。 */

import type { SortOrder } from "@/lib/common/sort";

/** 公会列表可排序字段。 */
export type GuildListSortField =
  | "name"
  | "level"
  | "members"
  | "money"
  | "prosperity"
  | "monthProsperity"
  | "createTime";

/** 公会列表各排序字段首次点击时的默认方向（文本类升序，数值类降序）。 */
export const GUILD_LIST_DEFAULT_ORDER: Record<GuildListSortField, SortOrder> = {
  name: "asc",
  level: "desc",
  members: "desc",
  money: "desc",
  prosperity: "desc",
  monthProsperity: "desc",
  createTime: "desc",
};

/** 公会成员可排序字段。 */
export type GuildMemberSortField =
  | "name"
  | "role"
  | "money"
  | "weekMoney"
  | "totalMoney"
  | "ore"
  | "kill"
  | "lastJoin";

/** 公会成员各排序字段首次点击时的默认方向。 */
export const GUILD_MEMBER_DEFAULT_ORDER: Record<
  GuildMemberSortField,
  SortOrder
> = {
  name: "asc",
  role: "asc",
  money: "desc",
  weekMoney: "desc",
  totalMoney: "desc",
  ore: "desc",
  kill: "desc",
  lastJoin: "desc",
};

/** 申请审批结果（guild_apply.apply_result）。 */
export type GuildApplyResult =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "other";

/** 公会战结果（guild_pvp_log.result）。 */
export type GuildPvpResult = "win" | "lose" | "unknown";

/** 排行榜条目（等级 / 活跃 / 月度活跃通用）。 */
export interface GuildRankEntry {
  rank: number;
  id: number;
  name: string;
  value: number;
}

/** 公会条目（列表 / 总览通用）。 */
export interface GuildListItem {
  id: number;
  name: string;
  description: string | null;
  level: number;
  money: number;
  prosperityDegree: number;
  monthProsperityDegree: number;
  sacredStoneLevel: number;
  /** 实际成员数（guild_player 聚合） */
  memberTotal: number;
  /** 公会记录的成员数上限 */
  memberMaxCount: number;
  seasonRank: number;
  creator: string | null;
  createTime: string | null;
  /** 加入模式：true 手动审批，false 自动加入 */
  joinMode: boolean;
  pvpStatus: boolean;
}

/** 公会申请统计。 */
export interface GuildApplyStats {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  cancelled: number;
}

/** 公会申请记录。 */
export interface GuildApplyEntry {
  playerName: string;
  applyTime: string | null;
  result: GuildApplyResult;
  /** 审批人（待审批为 null） */
  approverName: string | null;
}

/** 公会战记录。 */
export interface GuildPvpLogEntry {
  id: number;
  type: string;
  guildName: string;
  result: GuildPvpResult;
  season: number | null;
  rank: number | null;
  startTime: string | null;
  endTime: string | null;
}

/** 公会战玩家 K/D 排行条目。 */
export interface GuildPvpPlayerEntry {
  playerName: string;
  uuid: string;
  battles: number;
  kill: number;
  die: number;
}

/** 公会商店购买记录。 */
export interface GuildShopLogEntry {
  playerName: string;
  number: number;
  buyTime: string | null;
}

export interface GuildOverview {
  /** 公会总数 */
  totalGuilds: number;
  /** 公会成员总数（guild_player 聚合） */
  totalMembers: number;
  /** 公会资金总额 */
  totalMoney: number;
  /** 公会活跃度总和 */
  totalProsperity: number;
  /** 等级排行 Top10 */
  levelRanking: GuildRankEntry[];
  /** 活跃度排行 Top10 */
  prosperityRanking: GuildRankEntry[];
  /** 月度活跃排行 Top10 */
  monthProsperityRanking: GuildRankEntry[];
  /** 最新创建的公会 */
  latestGuilds: GuildListItem[];
  /** 今日公会签到人数（guild_player_sign_in，缺表为 null） */
  todaySignIns: number | null;
  /** 近 30 天公会签到趋势（缺表为 null） */
  signInTrend: { date: string; count: number }[] | null;
  /** 申请统计（guild_apply，缺表为 null） */
  applyStats: GuildApplyStats | null;
  /** 商店购买总次数（guild_shop_log，缺表为 null） */
  totalShopPurchases: number | null;
  /** 最近公会战记录（guild_pvp_log，缺表为 null） */
  recentPvpLogs: GuildPvpLogEntry[] | null;
}

/** 公会成员条目。 */
export interface GuildMemberItem {
  uuid: string;
  name: string;
  /** 角色标签（1 会长 / 2 副会 / 3 精英 / 4 成员，其余归为成员） */
  role: string;
  money: number;
  weekMoney: number;
  totalMoney: number;
  ore: number;
  totalOre: number;
  kill: number;
  die: number;
  joinTime: string | null;
  lastJoinTime: string | null;
}

export interface GuildDetail {
  id: number;
  name: string;
  description: string | null;
  level: number;
  money: number;
  prosperityDegree: number;
  monthProsperityDegree: number;
  sacredStoneLevel: number;
  /** 实际成员数（guild_player 聚合） */
  memberTotal: number;
  memberMaxCount: number;
  seasonRank: number;
  creator: string | null;
  createTime: string | null;
  joinMode: boolean;
  pvpStatus: boolean;
  /** 申请统计（guild_apply，缺表为 null） */
  applyStats: GuildApplyStats | null;
  /** 最近申请（缺表为 null） */
  recentApplies: GuildApplyEntry[] | null;
  /** 公会战记录（guild_pvp_log，缺表为 null） */
  pvpLogs: GuildPvpLogEntry[] | null;
  /** 公会战 K/D 排行（guild_pvp_player_log，缺表为 null） */
  pvpPlayerRanking: GuildPvpPlayerEntry[] | null;
  /** 商店购买总次数（guild_shop_log，缺表为 null） */
  totalShopPurchases: number | null;
  /** 最近商店购买（缺表为 null） */
  recentShopLogs: GuildShopLogEntry[] | null;
}

/** 全服玩家详情用的轻量摘要。 */
export interface GuildPlayerSummary {
  guildId: number;
  guildName: string;
  guildLevel: number;
  role: string;
  money: number;
  weekMoney: number;
  totalMoney: number;
  ore: number;
  kill: number;
  die: number;
  joinTime: string | null;
}
