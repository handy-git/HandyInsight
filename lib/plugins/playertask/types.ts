/** PlayerTask 插件共享类型。 */

/** 任务分类：每日 / NPC / 卷轴。 */
export type TaskCategory = "daily" | "npc" | "reel";

export interface TaskCoinRankEntry {
  rank: number;
  uuid: string;
  name: string;
  coins: number;
}

export interface TaskTypeStat {
  category: TaskCategory;
  label: string;
  /** 任务总数 */
  total: number;
  /** 已完成数 */
  completed: number;
}

export interface TaskRarityStat {
  rarity: string;
  total: number;
}

export interface TaskRecentEntry {
  uuid: string;
  name: string;
  taskName: string;
  category: TaskCategory;
  completed: boolean;
  taskDate: string;
}

export interface TaskOverview {
  /** 有任务币记录的玩家数 */
  coinPlayers: number;
  /** 任务币总量 */
  totalCoins: number;
  /** 今日完成任务数（每日 + NPC，卷轴无时间列） */
  todayCompleted: number;
  /** 最近 7 天有任务记录的玩家数 */
  activePlayers: number;
  /** 三类任务规模与完成分布 */
  typeStats: TaskTypeStat[];
  /** 卷轴稀有度分布 */
  rarityStats: TaskRarityStat[];
  /** 任务币排行 Top10 */
  coinRanking: TaskCoinRankEntry[];
  /** 最近任务动态（每日 / NPC，按时间倒序） */
  recentTasks: TaskRecentEntry[];
}

export interface TaskPlayerItem {
  uuid: string;
  name: string;
  /** 任务币余额，无记录为 null */
  coins: number | null;
  /** 已完成每日任务数 */
  dailyCompleted: number;
  /** 已完成 NPC 任务数 */
  npcCompleted: number;
  /** 已完成卷轴任务数 */
  reelCompleted: number;
  /** 最近任务时间（卷轴无时间列不参与） */
  lastTaskAt: string | null;
}

/** 单个任务的进度明细。 */
export interface TaskDemandProgress {
  type: string | null;
  completionAmount: number;
  amount: number;
  description: string | null;
}

/** 玩家的一条任务记录（三类任务统一结构）。 */
export interface TaskRecord {
  id: number;
  taskId: number | null;
  taskName: string;
  taskDemand: string | null;
  taskRewards: string | null;
  taskDate: string | null;
  status: number;
  completed: boolean;
  demands: TaskDemandProgress[];
  /** 每日任务：刷新次数 */
  refresh?: number | null;
  /** NPC 任务：领取次数 */
  claimCount?: number | null;
  /** 卷轴任务：稀有度 */
  rarity?: string | null;
}

export interface TaskPlayerDetail {
  uuid: string;
  name: string;
  /** 任务币余额 */
  coins: number | null;
  /** 上次登录时间 */
  lastJoinTime: string | null;
  /** 最后离线时间 */
  lastQuitTime: string | null;
  daily: TaskRecord[];
  npc: TaskRecord[];
  reel: TaskRecord[];
}

/* ---------- 任务库（静态配置） ---------- */

export interface TaskLibraryEntry {
  id: number;
  taskName: string;
  taskDemand: string | null;
  taskRewards: string | null;
  type: string | null;
  rarity: string | null;
  description: string | null;
  enableCommand: string | null;
}

export interface NpcTaskEntry {
  id: number;
  taskId: number | null;
  taskName: string | null;
  parentId: number | null;
  parentName: string | null;
  npcId: string | null;
  /** 是否永久任务 */
  isEver: boolean;
  /** 可完成次数 */
  number: number | null;
  /** 任务 CD（秒） */
  cdSeconds: number | null;
}

export interface ShopItemEntry {
  id: number;
  type: string | null;
  amount: number | null;
  itemStack: string | null;
}

export interface TaskPoolEntry {
  id: number;
  type: string | null;
  amount: number | null;
  description: string | null;
}

export interface TaskLibrary {
  tasks: TaskLibraryEntry[];
  npcTasks: NpcTaskEntry[];
  shopItems: ShopItemEntry[];
  demandPool: TaskPoolEntry[];
  rewardPool: TaskPoolEntry[];
}

/** 全服玩家详情用的轻量摘要。 */
export interface TaskPlayerSummary {
  coins: number | null;
  dailyCompleted: number;
  npcCompleted: number;
  reelCompleted: number;
  lastTaskAt: string | null;
}
