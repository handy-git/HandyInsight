/** PlayerWarp 插件共享类型。 */

/** 排行榜条目（热力 / 流量通用）。 */
export interface WarpRankEntry {
  rank: number;
  id: number;
  name: string;
  value: number;
}

/** 类型 / 服务器分布。 */
export interface WarpGroupStat {
  key: string;
  total: number;
}

export interface WarpOverview {
  /** 地标总数 */
  totalWarps: number;
  /** 显示中（上架）地标数 */
  displayedWarps: number;
  /** 地标总传送流量 */
  totalTp: number;
  /** 玩家收藏总数（warp_collection，缺表为 null） */
  totalCollections: number | null;
  /** 玩家评分总数（warp_like_player，缺表为 null） */
  totalLikes: number | null;
  /** 热力值 Top10 */
  thermalRanking: WarpRankEntry[];
  /** 传送流量 Top10 */
  tpRanking: WarpRankEntry[];
  /** 地标类型分布 */
  typeStats: WarpGroupStat[];
  /** 服务器分布 */
  serverStats: WarpGroupStat[];
  /** 最新创建的地标 */
  latestWarps: WarpEntry[];
}

/** 单个地标条目（列表 / 总览通用）。 */
export interface WarpEntry {
  id: number;
  name: string;
  type: string | null;
  /** 地标所有者 */
  ownerName: string;
  price: number;
  tpNumber: number;
  thermalValue: number;
  serverName: string | null;
  worldName: string | null;
  /** 是否显示（上架） */
  display: boolean;
  /** 是否置顶中 */
  top: boolean;
  createTime: string | null;
  expirationTime: string | null;
}

/** 玩家列表条目。 */
export interface WarpPlayerItem {
  uuid: string;
  name: string;
  /** 创建的地标数 */
  warpCount: number;
  /** 上架地标数 */
  displayedCount: number;
  /** 地标总流量 */
  totalTp: number;
  /** 地标总热力 */
  totalThermal: number;
  /** 最近创建地标时间 */
  lastCreateAt: string | null;
}

/** 玩家收藏的一条地标。 */
export interface WarpCollectionEntry {
  warpId: number;
  name: string;
  serverName: string | null;
  display: boolean;
  createTime: string | null;
}

/** 玩家最近传送记录。 */
export interface WarpTpRecord {
  warpId: number;
  name: string;
  serverName: string | null;
  playerUuid?: string;
  playerName?: string;
  tpTime: string | null;
}

/** 玩家渠道。 */
export interface WarpChannelEntry {
  warpName: string | null;
  serverName: string;
  warpId: number | null;
}

export interface WarpPlayerDetail {
  uuid: string;
  name: string;
  /** 创建的地标 */
  warps: WarpEntry[];
  /** 收藏的地标（缺表为 null） */
  collections: WarpCollectionEntry[] | null;
  /** 最近传送记录（缺表为 null） */
  tpRecords: WarpTpRecord[] | null;
  /** 玩家渠道（缺表为 null） */
  channels: WarpChannelEntry[] | null;
}

/** 地标库列表条目。 */
export interface WarpListEntry {
  id: number;
  name: string;
  type: string | null;
  ownerName: string;
  price: number;
  tpNumber: number;
  thermalValue: number;
  serverName: string | null;
  worldName: string | null;
  display: boolean;
  top: boolean;
  createTime: string | null;
  expirationTime: string | null;
}

/** 白名单玩家。 */
export interface WarpWhitelistEntry {
  playerName: string;
}

/** 地标详情。 */
export interface WarpDetail {
  id: number;
  name: string;
  type: string | null;
  description: string | null;
  ownerUuid: string;
  ownerName: string;
  price: number;
  tpNumber: number;
  thermalValue: number;
  serverName: string | null;
  worldName: string | null;
  warpLocation: string | null;
  display: boolean;
  top: boolean;
  creator: string | null;
  createTime: string | null;
  expirationTime: string | null;
  /** 收藏数（缺表为 null） */
  collectionCount: number | null;
  /** 评分人数（缺表为 null） */
  likeCount: number | null;
  /** 平均评分（缺表为 null） */
  avgLike: number | null;
  /** 白名单（缺表为 null） */
  whitelist: WarpWhitelistEntry[] | null;
  /** 最近传送（缺表为 null） */
  recentTp: WarpTpRecord[] | null;
}

/** 全服玩家详情用的轻量摘要。 */
export interface WarpPlayerSummary {
  warpCount: number;
  displayedCount: number;
  totalTp: number;
  lastCreateAt: string | null;
}
