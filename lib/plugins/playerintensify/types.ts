/** 强化总览统计。 */
export interface IntensifyOverview {
  /** 参与强化的玩家总数 */
  totalPlayers: number;
  /** 强化总次数（sum 合计） */
  totalAttempts: number;
  /** 成功总次数 */
  totalSuccess: number;
  /** 失败总次数 */
  totalFailure: number;
  /** 掉级总次数 */
  totalLevelOff: number;
  /** 消失总次数 */
  totalVanish: number;
  /** 全服总成功率（%，保留 1 位小数），无数据为 null */
  successRate: number | null;
}

/** 排行类型：按强化总数或最高等级排序。 */
export type IntensifyRankingType = "attempts" | "level";

/** 强化排行条目。 */
export interface IntensifyRankingEntry {
  rank: number;
  uuid: string;
  name: string;
  /** 排序主键值（强化总数或最高等级） */
  value: number;
  /** 个人成功率（%，保留 1 位小数），无强化记录为 null */
  successRate: number | null;
  maxLevel: number;
  /** 最高等级装备名称（含 Minecraft 颜色代码） */
  maxLevelName: string | null;
}

import type { SortOrder } from "@/lib/common/sort";

/** 强化玩家列表可排序字段。 */
export type IntensifySortField =
  | "attempts"
  | "succeed"
  | "failure"
  | "rate"
  | "level"
  | "name";

/** 各字段首次点击时的默认方向（数值降序，名称升序）。 */
export const INTENSIFY_DEFAULT_ORDER: Record<IntensifySortField, SortOrder> = {
  attempts: "desc",
  succeed: "desc",
  failure: "desc",
  rate: "desc",
  level: "desc",
  name: "asc",
};

/** 强化玩家列表条目。 */
export interface IntensifyPlayerItem {
  uuid: string;
  name: string;
  /** 强化总次数 */
  totalAttempts: number;
  /** 成功次数 */
  succeedNum: number;
  /** 失败次数 */
  failureNum: number;
  /** 成功率（%，保留 1 位小数），无强化记录为 null */
  successRate: number | null;
  /** 单次强化超过 10 的次数 */
  tenNum: number;
  /** 最高等级 */
  maxLevel: number;
  /** 最高等级装备名称 */
  maxLevelName: string | null;
}

/** 强化玩家详情。 */
export interface IntensifyPlayerDetail {
  uuid: string;
  name: string;
  /** 强化总次数 */
  totalAttempts: number;
  /** 成功次数 */
  succeedNum: number;
  /** 单次强化超过 10 的次数 */
  tenNum: number;
  /** 失败次数 */
  failureNum: number;
  /** 掉级次数 */
  levelOffNum: number;
  /** 消失次数 */
  vanishNum: number;
  /** 成功率（%，保留 1 位小数），无强化记录为 null */
  successRate: number | null;
  /** 最高等级 */
  maxLevel: number;
  /** 最高等级装备名称（含 Minecraft 颜色代码） */
  maxLevelName: string | null;
  /** 最高装备材质名字 */
  materialName: string | null;
}
