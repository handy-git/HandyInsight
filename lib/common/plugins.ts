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
];

/** 根据数据库中实际存在的表名，解析出可启用的插件。 */
export function resolveEnabledPlugins(tableNames: Set<string>): PluginMeta[] {
  return PLUGIN_REGISTRY.filter((plugin) =>
    plugin.tables.every((table) => tableNames.has(table)),
  );
}
