import type { SortOrder } from "@/lib/common/sort";

/** 账户列表可排序字段。 */
export type AuthmeSortField = "name" | "regDate" | "lastLoginAt";

/** 各排序字段首次点击时的默认方向（文本类升序，数值类降序）。 */
export const AUTHME_DEFAULT_ORDER: Record<AuthmeSortField, SortOrder> = {
  name: "asc",
  regDate: "desc",
  lastLoginAt: "desc",
};

export interface AuthmeOverview {
  /** 注册玩家总数 */
  totalPlayers: number;
  /** 当前处于登录状态（isLogged = 1） */
  loggedPlayers: number;
  /** 今日新注册 */
  todayRegistered: number;
  /** 今日登录过 */
  todayLoggedIn: number;
  /** 近 24 小时内登录过 */
  active24h: number;
  /** 近 7 天内登录过 */
  active7d: number;
  /** 近 30 天内登录过 */
  active30d: number;
}

export interface AuthmeTrendPoint {
  /** yyyy-MM-dd */
  date: string;
  registrations: number;
}

export interface AuthmeRecentLogin {
  username: string;
  realname: string;
  /** yyyy-MM-dd HH:mm:ss */
  lastLoginAt: string;
  ip: string | null;
  logged: boolean;
}

export interface AuthmeRecentRegistration {
  username: string;
  realname: string;
  /** yyyy-MM-dd HH:mm:ss */
  regDate: string;
  regIp: string | null;
}

export interface AuthmeAccountItem {
  username: string;
  realname: string;
  email: string | null;
  /** yyyy-MM-dd HH:mm:ss */
  regDate: string | null;
  /** yyyy-MM-dd HH:mm:ss */
  lastLoginAt: string | null;
  ip: string | null;
  logged: boolean;
  world: string;
  x: number;
  y: number;
  z: number;
}

export interface AuthmeAccountDetail {
  username: string;
  realname: string;
  email: string | null;
  regDate: string | null;
  regIp: string | null;
  lastLoginAt: string | null;
  ip: string | null;
  logged: boolean;
  hasSession: boolean;
  world: string;
  x: number;
  y: number;
  z: number;
  yaw: number | null;
  pitch: number | null;
}
