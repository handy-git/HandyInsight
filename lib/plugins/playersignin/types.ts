export interface SignInOverview {
  /** 今日签到人数 */
  todaySigns: number;
  /** 累计签到人次 */
  totalSigns: number;
  /** 参与过签到的玩家总数 */
  totalPlayers: number;
  /** 补签卡库存总量 */
  totalCards: number;
}

export interface SignInTrendPoint {
  /** yyyy-MM-dd */
  date: string;
  signs: number;
}

export interface TodaySignIn {
  uuid: string;
  name: string;
  /** HH:mm:ss */
  time: string;
  rank: number;
}

export interface SignInRankingEntry {
  rank: number;
  uuid: string;
  name: string;
  signs: number;
}

export interface SignInPlayerItem {
  uuid: string;
  name: string;
  totalSigns: number;
  monthSigns: number;
  /** yyyy-MM-dd HH:mm:ss */
  lastSignAt: string | null;
  /** 补签卡总数量 */
  cards: number;
}

export interface SignInCard {
  cardType: string;
  /** 可用月份，可能为 null（不限月份） */
  cardMonth: string | null;
  amount: number;
}

export interface SignInPlayerDetail {
  uuid: string;
  name: string;
  totalSigns: number;
  monthSigns: number;
  /** 最近连续签到天数 */
  streak: number;
  lastSignAt: string | null;
  cards: SignInCard[];
  /** 本月已签到的日期（日号，如 [1, 3, 21]） */
  monthDays: number[];
}

export interface SignInRecord {
  /** yyyy-MM-dd HH:mm:ss */
  signInDate: string;
  rank: number;
}
