import type { RowDataPacket } from "mysql2/promise";

import { num } from "@/lib/common/format";
import type { Paginated } from "@/lib/common/types";
import { createCache } from "@/lib/server/cache";
import { query } from "@/lib/server/mysql";
import type { SortOrder } from "@/lib/common/sort";
import type {
  IntensifyOverview,
  IntensifyPlayerDetail,
  IntensifyPlayerItem,
  IntensifyRankingEntry,
  IntensifyRankingType,
  IntensifySortField,
} from "@/lib/plugins/playerintensify/types";

const PAGE_SIZE = 20;

/** sum 为 MySQL 聚合函数名，作列名使用时必须反引号转义。 */
const SUM_COL = "`sum`";

/** 列表排序字段 → SQL ORDER BY 表达式（白名单，安全拼接方向后缀）。 */
const SORT_EXPR: Record<IntensifySortField, string> = {
  attempts: SUM_COL,
  succeed: "succeed_num",
  failure: "failure_num",
  // sum=0 时除法返回 NULL，用 IF 兜底为 -1 使其排在最低（成功率最低）
  rate: `IF(${SUM_COL} > 0, succeed_num / ${SUM_COL}, -1)`,
  level: "max_level",
  name: "player_name",
};

/** 百分比（保留 1 位小数）；分母为 0 返回 null。 */
function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/* ---------- 总览与排行：30 秒进程内缓存 ---------- */

const cached = createCache("playerintensify");

export async function getIntensifyOverview(): Promise<IntensifyOverview> {
  return cached("overview", async () => {
    const rows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS totalPlayers,
              COALESCE(SUM(${SUM_COL}), 0) AS totalAttempts,
              COALESCE(SUM(succeed_num), 0) AS totalSuccess,
              COALESCE(SUM(failure_num), 0) AS totalFailure,
              COALESCE(SUM(level_off_num), 0) AS totalLevelOff,
              COALESCE(SUM(vanish_num), 0) AS totalVanish
         FROM player_intensify`,
    );
    const row = rows[0] ?? {};
    const attempts = num(row.totalAttempts);
    const success = num(row.totalSuccess);
    return {
      totalPlayers: num(row.totalPlayers),
      totalAttempts: attempts,
      totalSuccess: success,
      totalFailure: num(row.totalFailure),
      totalLevelOff: num(row.totalLevelOff),
      totalVanish: num(row.totalVanish),
      successRate: rate(success, attempts),
    };
  });
}

export async function getIntensifyRanking(
  type: IntensifyRankingType,
): Promise<IntensifyRankingEntry[]> {
  return cached(`ranking:${type}`, async () => {
    const orderBy =
      type === "level"
        ? "ORDER BY maxLevel DESC, totalAttempts DESC"
        : "ORDER BY totalAttempts DESC, maxLevel DESC";
    // player_uuid 唯一索引允许 NULL，only_full_group_by 下无法推断函数依赖，
    // 非聚合列必须全部包进聚合函数（每 uuid 仅一行，MAX 语义不变）。
    const rows = await query<RowDataPacket[]>(
      `SELECT player_uuid AS uuid,
              MAX(player_name) AS name,
              MAX(${SUM_COL}) AS totalAttempts,
              MAX(succeed_num) AS succeedNum,
              MAX(max_level) AS maxLevel,
              MAX(max_level_name) AS maxLevelName
         FROM player_intensify
        GROUP BY player_uuid
        ${orderBy}
        LIMIT 20`,
    );
    return rows.map((row, index) => ({
      rank: index + 1,
      uuid: String(row.uuid),
      name: String(row.name),
      value: Number(row[type === "level" ? "maxLevel" : "totalAttempts"]),
      successRate: rate(Number(row.succeedNum), Number(row.totalAttempts)),
      maxLevel: Number(row.maxLevel),
      maxLevelName: row.maxLevelName ? String(row.maxLevelName) : null,
    }));
  });
}

/* ---------- 玩家列表（搜索 + 服务端分页） ---------- */

export async function getIntensifyPlayers(
  keyword: string,
  page: number,
  sort: IntensifySortField = "attempts",
  order: SortOrder = "desc",
): Promise<Paginated<IntensifyPlayerItem>> {
  const like = `%${keyword.toLowerCase()}%`;
  const offset = (page - 1) * PAGE_SIZE;
  const where = keyword
    ? "WHERE player_name LIKE ? OR player_uuid LIKE ?"
    : "";
  const baseParams = keyword ? [like, like] : [];

  const orderBy = `${SORT_EXPR[sort]} ${order.toUpperCase()}, id ASC`;
  const rows = await query<RowDataPacket[]>(
    `SELECT player_uuid AS uuid,
            player_name AS name,
            ${SUM_COL} AS totalAttempts,
            succeed_num AS succeedNum,
            failure_num AS failureNum,
            ten_num AS tenNum,
            max_level AS maxLevel,
            max_level_name AS maxLevelName
       FROM player_intensify
       ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
    [...baseParams, PAGE_SIZE, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM player_intensify ${where}`,
    baseParams,
  );

  return {
    items: rows.map((row) => {
      const attempts = num(row.totalAttempts);
      return {
        uuid: String(row.uuid),
        name: String(row.name),
        totalAttempts: attempts,
        succeedNum: num(row.succeedNum),
        failureNum: num(row.failureNum),
        successRate: rate(num(row.succeedNum), attempts),
        tenNum: num(row.tenNum),
        maxLevel: num(row.maxLevel),
        maxLevelName: row.maxLevelName ? String(row.maxLevelName) : null,
      };
    }),
    total: num(countRows[0]?.total),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 玩家详情 ---------- */

export async function getIntensifyPlayerDetail(
  uuid: string,
): Promise<IntensifyPlayerDetail | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT player_uuid AS uuid,
            player_name AS name,
            ${SUM_COL} AS totalAttempts,
            succeed_num AS succeedNum,
            ten_num AS tenNum,
            failure_num AS failureNum,
            level_off_num AS levelOffNum,
            vanish_num AS vanishNum,
            max_level AS maxLevel,
            max_level_name AS maxLevelName,
            material_name AS materialName
       FROM player_intensify
      WHERE player_uuid = ?
      LIMIT 1`,
    [uuid],
  );
  const row = rows[0];
  if (!row) return null;
  const attempts = num(row.totalAttempts);
  return {
    uuid: String(row.uuid),
    name: String(row.name),
    totalAttempts: attempts,
    succeedNum: num(row.succeedNum),
    tenNum: num(row.tenNum),
    failureNum: num(row.failureNum),
    levelOffNum: num(row.levelOffNum),
    vanishNum: num(row.vanishNum),
    successRate: rate(num(row.succeedNum), attempts),
    maxLevel: num(row.maxLevel),
    maxLevelName: row.maxLevelName ? String(row.maxLevelName) : null,
    materialName: row.materialName ? String(row.materialName) : null,
  };
}
