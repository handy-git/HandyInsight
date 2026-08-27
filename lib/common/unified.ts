/** 玩家中心的共享类型（客户端页面与服务端查询共用）。 */

export type PlayerSortKey =
  | "recent"
  | "registered"
  | "playtime"
  | "signin"
  | "intensify";

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
  /** 称号币（PlayerTitle） */
  titleCoins: number | null;
  /** 任务币（PlayerTask） */
  taskCoins: number | null;
  /** 创建地标数（PlayerWarp） */
  warpCount: number;
  /** 持有货币类型数（PlayerCurrency） */
  currencyTypes: number;
  /** 强化总次数（PlayerIntensify） */
  intensifyAttempts: number;
  /** 所属公会名（PlayerGuild），未加入为 null */
  guildName: string | null;
  /** 主权限组（LuckPerms），无记录为 null */
  primaryGroup: string | null;
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
  playertitle: {
    /** 佩戴中的称号 */
    usingTitle: string | null;
    /** 持有称号数 */
    titleCount: number;
    /** 称号币 */
    coins: number | null;
  } | null;
  task: {
    /** 任务币 */
    coins: number | null;
    /** 已完成每日任务数 */
    dailyCompleted: number;
    /** 已完成 NPC 任务数 */
    npcCompleted: number;
    /** 已完成卷轴任务数 */
    reelCompleted: number;
    /** 最近任务时间 */
    lastTaskAt: string | null;
  } | null;
  playerwarp: {
    /** 创建地标数 */
    warpCount: number;
    /** 上架地标数 */
    displayedCount: number;
    /** 地标总流量 */
    totalTp: number;
    /** 最近创建地标时间 */
    lastCreateAt: string | null;
  } | null;
  playercurrency: {
    /** 持有货币类型数 */
    typeCount: number;
    /** 余额最高的货币类型 */
    topType: string | null;
    /** 对应余额 */
    topBalance: number;
    /** 最近货币变动时间 */
    lastChangeAt: string | null;
  } | null;
  intensify: {
    /** 强化总次数 */
    totalAttempts: number;
    /** 成功次数 */
    succeedNum: number;
    /** 失败次数 */
    failureNum: number;
    /** 掉级次数 */
    levelOffNum: number;
    /** 消失次数 */
    vanishNum: number;
    /** 成功率（%，保留 1 位小数），无强化记录为 null */
    successRate: number | null;
    /** 最高等级 */
    maxLevel: number;
    /** 最高等级装备名称（含 Minecraft 颜色代码） */
    maxLevelName: string | null;
    /** 最高装备材质名字 */
    materialName: string | null;
  } | null;
  guild: {
    /** 公会 id */
    guildId: number;
    /** 公会名称 */
    guildName: string;
    /** 公会等级 */
    guildLevel: number;
    /** 角色标签（会长 / 管理员 / 成员） */
    role: string;
    /** 当前贡献度 */
    money: number;
    /** 周贡献度 */
    weekMoney: number;
    /** 总贡献度 */
    totalMoney: number;
    /** 矿石 */
    ore: number;
    /** 公会战击杀 */
    kill: number;
    /** 公会战死亡 */
    die: number;
    /** 加入公会时间 */
    joinTime: string | null;
  } | null;
  luckperms: {
    /** 主权限组 */
    primaryGroup: string | null;
    /** 直接权限数（缺表为 null） */
    directPermissionCount: number | null;
  } | null;
}

export interface TimelineEvent {
  /** yyyy-MM-dd HH:mm:ss */
  at: string;
  type: "login" | "session" | "signin" | "guild";
  /** 事件描述 */
  text: string;
}
