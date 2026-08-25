import type { SortOrder } from "@/lib/common/sort";

/** 称号库可排序字段。 */
export type TitleListSortField = "name" | "price" | "day" | "position";

/** 称号库各排序字段首次点击时的默认方向（文本类升序，数值类降序，position 按显示顺序升序）。 */
export const TITLE_LIST_DEFAULT_ORDER: Record<TitleListSortField, SortOrder> = {
  name: "asc",
  price: "desc",
  day: "desc",
  position: "asc",
};

/** 称号玩家列表可排序字段。 */
export type TitlePlayerSortField = "name" | "count" | "coins";

/** 称号玩家列表各排序字段首次点击时的默认方向（文本类升序，数值类降序）。 */
export const TITLE_PLAYER_DEFAULT_ORDER: Record<
  TitlePlayerSortField,
  SortOrder
> = {
  name: "asc",
  count: "desc",
  coins: "desc",
};

export interface TitleOverview {
  /** 称号总数（不含隐藏） */
  totalTitles: number;
  /** 持有称号的玩家数 */
  totalPlayers: number;
  /** 当前佩戴称号的玩家数 */
  usingPlayers: number;
  /** 称号币总量 */
  totalCoins: number;
}

export interface TitleRankEntry {
  rank: number;
  titleId: number | null;
  titleName: string;
  /** 持有玩家数 */
  players: number;
}

export interface TitleCoinRankEntry {
  rank: number;
  uuid: string | null;
  name: string;
  coins: number;
}

export interface TitleListItem {
  id: number;
  titleName: string;
  buyType: string | null;
  amount: number | null;
  /** 有效天数，0 为永久 */
  day: number;
  isHide: boolean;
  description: string | null;
  position: number;
  particleType: string | null;
  buffTypes: string[];
}

export interface TitlePlayerItem {
  uuid: string;
  name: string;
  /** 持有称号数 */
  titleCount: number;
  /** 佩戴中的称号名 */
  usingTitle: string | null;
  /** 称号币 */
  coins: number | null;
}

export interface TitlePlayerTitle {
  titleId: number | null;
  titleName: string;
  /** yyyy-MM-dd HH:mm:ss */
  expirationTime: string;
  isUse: boolean;
  isUseBuff: boolean;
  isUseParticle: boolean;
  expired: boolean;
  /** 7 天内到期 */
  expiringSoon: boolean;
}

export interface TitlePlayerDetail {
  uuid: string;
  name: string;
  usingTitle: string | null;
  coins: number | null;
  titles: TitlePlayerTitle[];
}
