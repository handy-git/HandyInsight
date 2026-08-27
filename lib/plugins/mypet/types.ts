import type { SortOrder } from "@/lib/common/sort";

/** 玩家列表可排序字段。 */
export type MypetSortField =
  | "name"
  | "count"
  | "exp"
  | "spawned"
  | "used";

/** 各排序字段首次点击时的默认方向（文本类升序，数值类降序）。 */
export const MYPET_DEFAULT_ORDER: Record<MypetSortField, SortOrder> = {
  name: "asc",
  count: "desc",
  exp: "desc",
  spawned: "desc",
  used: "desc",
};

export interface MypetOverview {
  /** 宠物总数量 */
  totalPets: number;
  /** 拥有宠物的玩家数 */
  totalPlayers: number;
  /** 宠物类型数 */
  totalTypes: number;
  /** 世界组数 */
  worldGroups: number;
}

export interface MypetTypeRankEntry {
  rank: number;
  /** 宠物类型（如 WOLF / CAT） */
  type: string;
  /** 该类型宠物数 */
  pets: number;
}

export interface MypetPlayerRankEntry {
  rank: number;
  uuid: string;
  name: string;
  /** 宠物数 */
  pets: number;
}

export interface MypetPlayerItem {
  uuid: string;
  name: string;
  /** 拥有宠物数 */
  petCount: number;
  /** 最高经验 */
  maxExp: number;
  /** 出战（wants_to_spawn=1）宠物数 */
  spawnedCount: number;
  /** 最后使用时间 yyyy-MM-dd HH:mm:ss，无记录为 null */
  lastUsedAt: string | null;
}

export interface MypetPetItem {
  /** 宠物 UUID */
  uuid: string;
  /** 宠物类型（不展示 varbinary 名字，仅类型） */
  type: string;
  /** 经验 */
  exp: number;
  /** 生命值 */
  health: number;
  /** 重生时间（秒） */
  respawnTime: number;
  /** 饥饿度 */
  hunger: number;
  /** 世界组 */
  worldGroup: string | null;
  /** 是否希望生成（出战） */
  wantsToSpawn: boolean;
  /** 技能树 */
  skilltree: string | null;
  /** 最后使用时间 yyyy-MM-dd HH:mm:ss，无记录为 null */
  lastUsedAt: string | null;
}

export interface MypetPlayerDetail {
  uuid: string;
  name: string;
  /** 宠物列表，按经验降序 */
  pets: MypetPetItem[];
}
