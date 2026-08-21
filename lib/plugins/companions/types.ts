export interface CompanionsOverview {
  /** 拥有宠物的玩家数 */
  totalPlayers: number;
  /** 当前出战宠物的玩家数 */
  activePlayers: number;
  /** 宠物总数量 */
  totalCompanions: number;
  /** 宠物货币总量 */
  totalCoins: number;
}

export interface CompanionsRankEntry {
  rank: number;
  /** 宠物标识 */
  companion: string;
  /** 持有玩家数 */
  players: number;
}

export interface CompanionsEquipmentEntry {
  /** 装备 KEY */
  equipment: string;
  /** 使用玩家数 */
  players: number;
}

export interface CompanionsPlayerItem {
  uuid: string;
  name: string;
  /** 拥有宠物数 */
  companionCount: number;
  /** 出战宠物 */
  activeCompanion: string | null;
  /** 最高能力等级 */
  maxAbilityLevel: number;
  /** 宠物货币 */
  coins: number | null;
}

export interface CompanionsOwnedItem {
  companion: string;
  customName: string | null;
  customWeapon: string | null;
  nameVisible: boolean;
  abilityLevel: number;
}

export interface CompanionsEquipmentItem {
  equipment: string;
  /** 该装备使用的宠物 */
  companion: string | null;
}

export interface CompanionsPlayerDetail {
  uuid: string;
  name: string;
  activeCompanion: string | null;
  coins: number | null;
  companions: CompanionsOwnedItem[];
  equipments: CompanionsEquipmentItem[];
}
