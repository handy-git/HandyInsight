/** PlayerTop 插件共享类型。 */

import type { SortOrder } from "@/lib/common/sort";

/** 单个排行榜（PAPI 变量）概览。 */
export interface TopPapiStat {
  /** PAPI 变量类型（排行榜维度） */
  papi: string;
  /** 上榜玩家数 */
  players: number;
  /** 当前最高值 */
  maxValue: number;
  /** 最近更新时间 */
  lastUpdateAt: string | null;
}

/** 排行榜条目（以表内 rank 为准）。 */
export interface TopRankEntry {
  rank: number;
  uuid: string;
  name: string;
  /** 排行值（vault） */
  value: number;
  /** 记录更新时间 */
  updateAt: string | null;
}

export interface TopOverview {
  /** 排行类型数 */
  totalPapIs: number;
  /** 上榜玩家数（去重） */
  totalPlayers: number;
  /** 排行记录总数 */
  totalRecords: number;
  /** 最近更新时间（全表） */
  lastUpdateAt: string | null;
  /** 各排行榜概览 */
  papiStats: TopPapiStat[];
  /** 最近发奖记录 */
  recentRewards: TopRewardLogEntry[];
}

/** 发奖记录条目。 */
export interface TopRewardLogEntry {
  id: number;
  playerUuid: string;
  playerName: string;
  /** 对应排行榜 */
  papi: string;
  /** 获奖排名 */
  rank: number | null;
  /** 奖励类型 */
  type: string | null;
  /** 消息（含 Minecraft 颜色代码的多行文本，可能以 JSON 数组或 \n 分隔存储） */
  message: string | null;
  /** 命令（含 Minecraft 颜色代码的多行文本，可能以 JSON 数组或 \n 分隔存储） */
  command: string | null;
  /** 状态（0/1，约定 1 为已发放，0 为待处理） */
  status: number | null;
  createTime: string | null;
}

/** 玩家在某排行榜的上榜记录。 */
export interface TopPlayerRankEntry {
  papi: string;
  rank: number;
  value: number;
  updateAt: string | null;
}

export interface TopPlayerDetail {
  uuid: string;
  name: string;
  /** 各排行榜上榜记录 */
  ranks: TopPlayerRankEntry[];
  /** 获奖记录 */
  rewards: TopRewardLogEntry[];
}

/** 发奖记录可排序字段。 */
export type TopRewardSortField =
  | "name"
  | "papi"
  | "rank"
  | "type"
  | "status"
  | "time";

/** 发奖记录各排序字段首次点击时的默认方向（文本类升序，数值类降序）。 */
export const TOP_REWARD_DEFAULT_ORDER: Record<TopRewardSortField, SortOrder> = {
  name: "asc",
  papi: "asc",
  rank: "asc",
  type: "asc",
  status: "asc",
  time: "desc",
};

/** 全服玩家详情用的轻量摘要。 */
export interface TopPlayerSummary {
  /** 上榜排行数 */
  rankCount: number;
  /** 最佳排名（数值最小），未上榜为 null */
  bestRank: number | null;
  /** 最佳排名对应的排行榜 */
  bestPapi: string | null;
  /** 最近上榜更新时间 */
  lastUpdateAt: string | null;
}
