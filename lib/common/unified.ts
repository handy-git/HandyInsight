/** 玩家中心的共享类型（客户端页面与服务端查询共用）。 */

export type PlayerSortKey = "recent" | "registered" | "playtime" | "signin";

export interface UnifiedPlayerItem {
  key: string;
  uuid: string | null;
  name: string;
  registeredAt: string | null;
  sources: string[];
  lastActiveAt: string | null;
  online: boolean;
  totalSeconds: number;
  totalSigns: number;
  /** 拥有宠物数（CompanionsPlus） */
  companionCount: number;
  /** 宠物货币（CompanionsPlus） */
  companionCoins: number | null;
}

export interface UnifiedPlayerDetail {
  key: string;
  uuid: string | null;
  name: string;
  registeredAt: string | null;
  sources: string[];
  lastActiveAt: string | null;
  online: boolean;
  playtime: {
    todaySeconds: number;
    weekSeconds: number;
    monthSeconds: number;
    totalSeconds: number;
    trend: { date: string; seconds: number }[];
  } | null;
  signin: {
    totalSigns: number;
    monthSigns: number;
    streak: number;
    cards: { cardType: string; cardMonth: string | null; amount: number }[];
    /** 本月已签到的日号 */
    monthDays: number[];
  } | null;
  authme: {
    username: string;
    email: string | null;
    regIp: string | null;
    ip: string | null;
    lastLoginAt: string | null;
    logged: boolean;
    world: string;
    x: number;
    y: number;
    z: number;
  } | null;
  companions: {
    /** 拥有宠物数 */
    totalCompanions: number;
    /** 宠物货币 */
    coins: number | null;
    /** 出战宠物 */
    activeCompanion: string | null;
    /** 最高能力等级 */
    maxAbilityLevel: number;
  } | null;
}

export interface TimelineEvent {
  /** yyyy-MM-dd HH:mm:ss */
  at: string;
  type: "login" | "session" | "signin";
  /** 事件描述 */
  text: string;
}
