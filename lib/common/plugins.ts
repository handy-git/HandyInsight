/**
 * 插件注册表（常量池）。
 *
 * 每个可插拔模块在这里登记元信息；连接 MySQL 后按“所需数据表是否齐全”
 * 决定启用哪些插件。新增插件时只需在此登记并实现 lib/plugins/<id>/ 包。
 */
export interface PluginMeta {
  /** 插件标识，同时作为 lib/plugins/ 下的包名 */
  id: string;
  /** 展示名称 */
  name: string;
  /** 功能描述 */
  description: string;
  /** 启用所需的全部数据表（缺一不可） */
  tables: string[];
  /** 插件落地页路径 */
  landing: string;
}

export const PLUGIN_REGISTRY: PluginMeta[] = [
  {
    id: "playertime",
    name: "PlayerTime",
    description: "在线时长统计",
    tables: ["player_time", "player_time_record"],
    landing: "/dashboard",
  },
  {
    id: "playersignin",
    name: "PlayerSignIn",
    description: "签到统计",
    tables: ["player_sign_in", "player_sign_card"],
    landing: "/signin",
  },
  {
    id: "authme",
    name: "AuthMe",
    description: "账户认证",
    tables: ["authme"],
    landing: "/authme",
  },
  {
    id: "companions",
    name: "CompanionsPlus",
    description: "小精灵系统",
    tables: [
      "companions_active",
      "companions_coin",
      "companions_equipment",
      "companions_owned",
    ],
    landing: "/companions",
  },
  {
    id: "playertitle",
    name: "PlayerTitle",
    description: "称号系统",
    tables: ["title_list", "title_player", "title_coin"],
    landing: "/title",
  },
  {
    id: "playertask",
    name: "PlayerTask",
    description: "任务系统",
    tables: ["task_coin", "task_player", "task_npc_player", "task_reel"],
    landing: "/task",
  },
  {
    id: "playerwarp",
    name: "PlayerWarp",
    description: "地标传送",
    tables: ["warp_player", "warp_tp_player"],
    landing: "/warp",
  },
  {
    id: "playercurrency",
    name: "PlayerCurrency",
    description: "货币系统",
    tables: ["player_currency", "player_currency_log"],
    landing: "/currency",
  },
  {
    id: "playerintensify",
    name: "PlayerIntensify",
    description: "装备强化",
    tables: ["player_intensify"],
    landing: "/intensify",
  },
  {
    id: "playerguild",
    name: "PlayerGuild",
    description: "公会系统",
    tables: ["guild_info", "guild_player"],
    landing: "/guild",
  },
  {
    id: "mypet",
    name: "MyPet",
    description: "宠物系统",
    // pets 提供统计数据；players 提供 owner_uuid 的玩家名解析（pets 表无名字段）
    tables: ["mypet_pets", "mypet_players"],
    landing: "/mypet",
  },
  {
    id: "luckperms",
    name: "LuckPerms",
    description: "权限管理",
    tables: ["luckperms_players", "luckperms_group_permissions"],
    landing: "/luckperms",
  },
  {
    id: "playertop",
    name: "PlayerTop",
    description: "玩家排行",
    // top_papi_player 提供排行数据；top_reward_log 提供发奖记录（轻量统计）
    tables: ["top_papi_player", "top_reward_log"],
    landing: "/top",
  },
];

/** 根据数据库中实际存在的表名，解析出可启用的插件。 */
export function resolveEnabledPlugins(tableNames: Set<string>): PluginMeta[] {
  return PLUGIN_REGISTRY.filter((plugin) =>
    plugin.tables.every((table) => tableNames.has(table)),
  );
}
