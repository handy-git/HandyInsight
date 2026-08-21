import type { RowDataPacket } from "mysql2";

import {
  PLUGIN_REGISTRY,
  resolveEnabledPlugins,
  type PluginMeta,
} from "@/lib/common/plugins";

/** 任意能执行参数化查询的连接/池。 */
export type QueryRunner = (
  sql: string,
  params: unknown[],
) => Promise<RowDataPacket[]>;

/**
 * 探测数据库中存在的表，返回可启用的插件列表。
 * 通过注入查询执行器，同时支持临时连接（配置测试）与常驻连接池。
 */
export async function detectEnabledPlugins(
  database: string,
  run: QueryRunner,
): Promise<PluginMeta[]> {
  const allTables = [...new Set(PLUGIN_REGISTRY.flatMap((p) => p.tables))];
  const placeholders = allTables.map(() => "?").join(", ");
  const rows = await run(
    `SELECT TABLE_NAME AS tableName
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${placeholders})`,
    [database, ...allTables],
  );
  return resolveEnabledPlugins(
    new Set(rows.map((row) => String(row.tableName))),
  );
}
