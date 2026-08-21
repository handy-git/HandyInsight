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

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type TrendRange = "7d" | "30d";
