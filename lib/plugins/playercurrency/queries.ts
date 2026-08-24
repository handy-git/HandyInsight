import type { RowDataPacket } from "mysql2/promise";

import { formatDateTime, num } from "@/lib/common/format";
import type { Paginated } from "@/lib/common/types";
import {
  currencyLogsQuerySchema,
  currencyPlayersQuerySchema,
  currencyUuidSchema,
} from "@/lib/plugins/playercurrency/schemas";
import type {
  CurrencyBalanceEntry,
  CurrencyLogEntry,
  CurrencyOverview,
  CurrencyPlayerDetail,
  CurrencyPlayerItem,
  CurrencyPlayerSummary,
} from "@/lib/plugins/playercurrency/types";
import { createCache } from "@/lib/server/cache";
import { query } from "@/lib/server/mysql";

const PAGE_SIZE = 20;

export {
  currencyLogsQuerySchema,
  currencyPlayersQuerySchema,
  currencyUuidSchema,
};

/* ---------- 总览：30 秒进程内缓存（共享实现，命名空间隔离） ---------- */

const cached = createCache("playercurrency");

/** `change` 是 MySQL 保留字，取列必须反引号。 */
const LOG_SELECT = `SELECT id, player_uuid AS playerUuid, player_name AS playerName,
       type, old_balance AS oldBalance, \`change\` AS changeValue, balance,
       operator_reason AS reason, operator_name AS operatorName,
       operator_time AS operatorTime
  FROM player_currency_log`;

function toLogEntry(row: RowDataPacket): CurrencyLogEntry {
  return {
    id: Number(row.id),
    playerUuid: String(row.playerUuid ?? ""),
    playerName: row.playerName ? String(row.playerName) : "未知玩家",
    type: String(row.type ?? ""),
    oldBalance: num(row.oldBalance),
    changeValue: num(row.changeValue),
    balance: num(row.balance),
    reason: row.reason ? String(row.reason) : null,
    operatorName: row.operatorName ? String(row.operatorName) : null,
    operatorTime: row.operatorTime
      ? formatDateTime(String(row.operatorTime))
      : null,
  };
}

export async function getCurrencyOverview(): Promise<CurrencyOverview> {
  return cached("overview", async () => {
    const [statRows, typeRows, rankRows, logCountRows, logRows] =
      await Promise.all([
        query<RowDataPacket[]>(
          `SELECT COUNT(DISTINCT type) AS totalTypes,
                  COUNT(DISTINCT player_uuid) AS holdingPlayers,
                  COALESCE(SUM(balance), 0) AS totalBalance
             FROM player_currency`,
        ),
        query<RowDataPacket[]>(
          `SELECT type,
                  COUNT(*) AS players,
                  COALESCE(SUM(balance), 0) AS totalBalance,
                  COALESCE(SUM(total), 0) AS totalEarned
             FROM player_currency
            GROUP BY type
            ORDER BY totalBalance DESC, type ASC`,
        ),
        query<RowDataPacket[]>(
          `SELECT player_uuid AS uuid, MAX(player_name) AS name,
                  COALESCE(SUM(balance), 0) AS totalBalance
             FROM player_currency
            WHERE player_uuid IS NOT NULL
            GROUP BY player_uuid
            ORDER BY totalBalance DESC, name ASC
            LIMIT 10`,
        ),
        query<RowDataPacket[]>(
          `SELECT COUNT(*) AS total FROM player_currency_log`,
        ),
        query<RowDataPacket[]>(
          `${LOG_SELECT}
            ORDER BY operator_time DESC, id DESC
            LIMIT 10`,
        ),
      ]);

    const stat = statRows[0] ?? {};
    return {
      totalTypes: num(stat.totalTypes),
      holdingPlayers: num(stat.holdingPlayers),
      totalBalance: num(stat.totalBalance),
      totalChanges: num(logCountRows[0]?.total),
      typeStats: typeRows.map((row) => ({
        type: String(row.type),
        players: num(row.players),
        totalBalance: num(row.totalBalance),
        totalEarned: num(row.totalEarned),
      })),
      balanceRanking: rankRows.map((row, index) => ({
        rank: index + 1,
        uuid: String(row.uuid),
        name: row.name ? String(row.name) : String(row.uuid).slice(0, 8),
        value: num(row.totalBalance),
      })),
      recentLogs: logRows.map(toLogEntry),
    };
  });
}

/* ---------- 玩家列表（搜索 + 服务端分页，按 uuid 聚合） ---------- */

export async function getCurrencyPlayers(
  keyword: string,
  page: number,
): Promise<Paginated<CurrencyPlayerItem>> {
  const like = `%${keyword}%`;
  const offset = (page - 1) * PAGE_SIZE;
  const where = keyword ? "WHERE u.name LIKE ?" : "";
  const baseParams = keyword ? [like] : [];

  const [rows, countRows, activityRows] = await Promise.all([
    query<RowDataPacket[]>(
      `SELECT u.uuid,
              MAX(u.name) AS name,
              MAX(u.typeCount) AS typeCount,
              MAX(u.totalBalance) AS totalBalance
         FROM (
           SELECT player_uuid AS uuid, MAX(player_name) AS name,
                  COUNT(*) AS typeCount,
                  COALESCE(SUM(balance), 0) AS totalBalance
             FROM player_currency
            WHERE player_uuid IS NOT NULL
            GROUP BY player_uuid
         ) u
         ${where}
        GROUP BY u.uuid
        ORDER BY totalBalance DESC, name ASC
        LIMIT ? OFFSET ?`,
      [...baseParams, PAGE_SIZE, offset],
    ),
    query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
         FROM (
           SELECT DISTINCT u.uuid
             FROM (
               SELECT player_uuid AS uuid, MAX(player_name) AS name
                 FROM player_currency
                WHERE player_uuid IS NOT NULL
                GROUP BY player_uuid
             ) u
            ${where}
         ) t`,
      baseParams,
    ),
    query<RowDataPacket[]>(
      `SELECT player_uuid AS uuid, MAX(operator_time) AS lastChangeAt
         FROM player_currency_log
        WHERE player_uuid IS NOT NULL
        GROUP BY player_uuid`,
    ),
  ]);

  const lastChangeMap = new Map<string, string>();
  for (const row of activityRows) {
    if (row.lastChangeAt) {
      lastChangeMap.set(String(row.uuid), formatDateTime(String(row.lastChangeAt)));
    }
  }

  return {
    items: rows.map((row) => ({
      uuid: String(row.uuid),
      name: row.name ? String(row.name) : String(row.uuid).slice(0, 8),
      typeCount: num(row.typeCount),
      totalBalance: num(row.totalBalance),
      lastChangeAt: lastChangeMap.get(String(row.uuid)) ?? null,
    })),
    total: num(countRows[0]?.total),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 玩家货币详情 ---------- */

export async function getCurrencyPlayerDetail(
  uuid: string,
): Promise<CurrencyPlayerDetail | null> {
  const [balanceRows, logRows] = await Promise.all([
    query<RowDataPacket[]>(
      `SELECT type, balance, total
         FROM player_currency
        WHERE player_uuid = ?
        ORDER BY balance DESC, type ASC`,
      [uuid],
    ),
    query<RowDataPacket[]>(
      `${LOG_SELECT}
        WHERE player_uuid = ?
        ORDER BY operator_time DESC, id DESC
        LIMIT 50`,
      [uuid],
    ),
  ]);

  if (balanceRows.length === 0 && logRows.length === 0) {
    return null;
  }

  const balances: CurrencyBalanceEntry[] = balanceRows.map((row) => ({
    type: String(row.type ?? ""),
    balance: num(row.balance),
    total: num(row.total),
  }));

  const nameRow =
    balanceRows[0] ??
    logRows.find((row) => row.playerName) ??
    ({} as RowDataPacket);

  return {
    uuid,
    name: nameRow.playerName
      ? String(nameRow.playerName)
      : uuid.slice(0, 8),
    balances,
    logs: logRows.map(toLogEntry),
  };
}

/* ---------- 货币流水（搜索 + 类型筛选 + 分页） ---------- */

export async function getCurrencyLogs(input: {
  keyword: string;
  type: string;
  page: number;
}): Promise<Paginated<CurrencyLogEntry>> {
  const { keyword, type, page } = input;
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (keyword) {
    conditions.push(
      "(player_name LIKE ? OR operator_name LIKE ? OR operator_reason LIKE ?)",
    );
    const like = `%${keyword}%`;
    params.push(like, like, like);
  }
  if (type) {
    conditions.push("type = ?");
    params.push(type);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * PAGE_SIZE;

  const [rows, countRows] = await Promise.all([
    query<RowDataPacket[]>(
      `${LOG_SELECT}
        ${where}
        ORDER BY operator_time DESC, id DESC
        LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, offset],
    ),
    query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM player_currency_log ${where}`,
      params,
    ),
  ]);

  return {
    items: rows.map(toLogEntry),
    total: num(countRows[0]?.total),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 全服玩家详情用的轻量摘要 ---------- */

export async function getCurrencyPlayerSummary(
  uuid: string,
): Promise<CurrencyPlayerSummary | null> {
  const [statRows, topRows, logRows] = await Promise.all([
    query<RowDataPacket[]>(
      `SELECT COUNT(*) AS typeCount
         FROM player_currency
        WHERE player_uuid = ?`,
      [uuid],
    ),
    query<RowDataPacket[]>(
      `SELECT type, balance
         FROM player_currency
        WHERE player_uuid = ?
        ORDER BY balance DESC, type ASC
        LIMIT 1`,
      [uuid],
    ),
    query<RowDataPacket[]>(
      `SELECT MAX(operator_time) AS lastChangeAt
         FROM player_currency_log
        WHERE player_uuid = ?`,
      [uuid],
    ),
  ]);

  const typeCount = num(statRows[0]?.typeCount);
  if (typeCount === 0) {
    return null;
  }

  return {
    typeCount,
    topType: topRows[0]?.type ? String(topRows[0].type) : null,
    topBalance: num(topRows[0]?.balance),
    lastChangeAt: logRows[0]?.lastChangeAt
      ? formatDateTime(String(logRows[0].lastChangeAt))
      : null,
  };
}
