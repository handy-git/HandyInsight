/** PlayerCurrency 插件共享类型。 */

import type { SortOrder } from "@/lib/common/sort";

/** 玩家列表可排序字段。 */
export type CurrencyPlayerSortField =
  | "name"
  | "types"
  | "balance"
  | "lastChange";

/** 玩家列表各排序字段首次点击时的默认方向（文本类升序，数值类降序）。 */
export const CURRENCY_PLAYER_DEFAULT_ORDER: Record<
  CurrencyPlayerSortField,
  SortOrder
> = {
  name: "asc",
  types: "desc",
  balance: "desc",
  lastChange: "desc",
};

/** 货币流水可排序字段。 */
export type CurrencyLogSortField =
  | "name"
  | "type"
  | "oldBalance"
  | "change"
  | "balance"
  | "time";

/** 货币流水各排序字段首次点击时的默认方向（文本类升序，数值类降序）。 */
export const CURRENCY_LOG_DEFAULT_ORDER: Record<
  CurrencyLogSortField,
  SortOrder
> = {
  name: "asc",
  type: "asc",
  oldBalance: "desc",
  change: "desc",
  balance: "desc",
  time: "desc",
};

/** 货币类型统计。 */
export interface CurrencyTypeStat {
  type: string;
  /** 持有该货币的玩家数 */
  players: number;
  /** 流通余额 */
  totalBalance: number;
  /** 累计总量（total 列合计） */
  totalEarned: number;
}

/** 余额排行条目。 */
export interface CurrencyRankEntry {
  rank: number;
  uuid: string;
  name: string;
  value: number;
}

/** 一条货币变更记录。 */
export interface CurrencyLogEntry {
  id: number;
  playerUuid: string;
  playerName: string;
  type: string;
  oldBalance: number;
  /** 变更值（正数增加，负数扣除） */
  changeValue: number;
  balance: number;
  /** 变更原因 */
  reason: string | null;
  /** 变更人 */
  operatorName: string | null;
  operatorTime: string | null;
}

export interface CurrencyOverview {
  /** 货币类型数 */
  totalTypes: number;
  /** 持有任意货币的玩家数 */
  holdingPlayers: number;
  /** 流通总量（跨类型合计） */
  totalBalance: number;
  /** 变更记录总数 */
  totalChanges: number;
  /** 各货币类型统计 */
  typeStats: CurrencyTypeStat[];
  /** 余额排行 Top10 */
  balanceRanking: CurrencyRankEntry[];
  /** 最近变更记录 */
  recentLogs: CurrencyLogEntry[];
}

/** 玩家列表条目。 */
export interface CurrencyPlayerItem {
  uuid: string;
  name: string;
  /** 持有货币类型数 */
  typeCount: number;
  /** 总余额（跨类型合计） */
  totalBalance: number;
  /** 最近货币变动时间 */
  lastChangeAt: string | null;
}

/** 玩家某一种货币的余额。 */
export interface CurrencyBalanceEntry {
  type: string;
  balance: number;
  total: number;
}

export interface CurrencyPlayerDetail {
  uuid: string;
  name: string;
  /** 各货币余额 */
  balances: CurrencyBalanceEntry[];
  /** 最近变更记录 */
  logs: CurrencyLogEntry[];
}

/** 全服玩家详情用的轻量摘要。 */
export interface CurrencyPlayerSummary {
  /** 持有货币类型数 */
  typeCount: number;
  /** 余额最高的货币类型 */
  topType: string | null;
  /** 对应余额 */
  topBalance: number;
  /** 最近货币变动时间 */
  lastChangeAt: string | null;
}
