import type { Paginated } from "@/lib/common/types";
import type { SortOrder } from "@/lib/common/sort";

export type { Paginated };

/** 玩家列表可排序字段。 */
export type PlayerTimeSortField = "name" | "today" | "week" | "month" | "total";

/** 各排序字段首次点击时的默认方向（文本类升序，数值类降序）。 */
export const PLAYERTIME_DEFAULT_ORDER: Record<PlayerTimeSortField, SortOrder> = {
  name: "asc",
  today: "desc",
  week: "desc",
  month: "desc",
  total: "desc",
};

export interface PlayertimeOverview {
  onlinePlayers: number;
  todayActivePlayers: number;
  todaySeconds: number;
  averageSessionSeconds: number;
}

export interface TrendPoint {
  /** yyyy-MM-dd */
  date: string;
  seconds: number;
  players: number;
}

export interface OnlinePlayer {
  uuid: string;
  name: string;
  /** yyyy-MM-dd HH:mm:ss */
  loginTime: string;
  sessionSeconds: number;
}

export type RankingScope = "today" | "week" | "month" | "total";

export interface RankingEntry {
  rank: number;
  uuid: string;
  name: string;
  seconds: number;
}

export interface PlayerListItem {
  uuid: string;
  name: string;
  online: boolean;
  todaySeconds: number;
  weekSeconds: number;
  monthSeconds: number;
  totalSeconds: number;
}

export interface PlayerDetail {
  uuid: string;
  name: string;
  online: boolean;
  /** 当前会话登录时间；离线时为 null */
  loginTime: string | null;
  todaySeconds: number;
  weekSeconds: number;
  monthSeconds: number;
  totalSeconds: number;
}

export interface SessionItem {
  loginTime: string;
  /** 未结束会话为 null */
  quitTime: string | null;
  seconds: number;
}

export type TrendRange = "7d" | "30d";
