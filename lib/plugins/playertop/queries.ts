import type { RowDataPacket } from "mysql2/promise";

import { formatDateTime, num } from "@/lib/common/format";
import type { SortOrder } from "@/lib/common/sort";
import type { Paginated } from "@/lib/common/types";
import {
  topLogsQuerySchema,
  topRankingQuerySchema,
  topUuidSchema,
} from "@/lib/plugins/playertop/schemas";
import type {
  TopOverview,
  TopPapiStat,
  TopPlayerDetail,
  TopPlayerRankEntry,
  TopPlayerSummary,
  TopRankEntry,
  TopRewardLogEntry,
  TopRewardSortField,
} from "@/lib/plugins/playertop/types";
import { createCache } from "@/lib/server/cache";
import { query } from "@/lib/server/mysql";

const PAGE_SIZE = 20;

export {
  topLogsQuerySchema,
  topRankingQuerySchema,
  topUuidSchema,
};

/* ---------- 总览：30 秒进程内缓存（共享实现，命名空间隔离） ---------- */

const cached = createCache("playertop");

function toRewardEntry(row: RowDataPacket): TopRewardLogEntry {
  return {
    id: Number(row.id),
    playerUuid: String(row.playerUuid ?? ""),
    playerName: row.playerName ? String(row.playerName) : "未知玩家",
    papi: String(row.papi ?? ""),
    rank: row.rank === null || row.rank === undefined ? null : num(row.rank),
    type: row.type ? String(row.type) : null,
    message: row.message ? String(row.message) : null,
    command: row.command ? String(row.command) : null,
    status: row.status === null || row.status === undefined ? null : num(row.status),
    createTime: row.createTime ? formatDateTime(String(row.createTime)) : null,
  };
}

/** `rank` 是 MySQL 保留字，读取列必须反引号。 */
const RANK_SELECT = `SELECT player_uuid AS playerUuid, player_name AS playerName,
       vault, \`rank\`, update_time AS updateAt
  FROM top_papi_player`;

const REWARD_SELECT = `SELECT id, player_uuid AS playerUuid, player_name AS playerName,
       papi, \`rank\`, type, message, command, status,
       create_time AS createTime
  FROM top_reward_log`;

export async function getTopOverview(): Promise<TopOverview> {
  return cached("overview", async () => {
    const [statRows, papiRows, rewardRows] = await Promise.all([
      query<RowDataPacket[]>(
        `SELECT COUNT(DISTINCT papi) AS totalPapIs,
                COUNT(DISTINCT player_uuid) AS totalPlayers,
                COUNT(*) AS totalRecords,
                MAX(update_time) AS lastUpdateAt
           FROM top_papi_player`,
      ),
      query<RowDataPacket[]>(
        `SELECT papi,
                COUNT(*) AS players,
                MAX(vault) AS \`maxValue\`,
                MAX(update_time) AS lastUpdateAt
           FROM top_papi_player
          WHERE papi IS NOT NULL
          GROUP BY papi
          ORDER BY players DESC, papi ASC`,
      ),
      query<RowDataPacket[]>(
        `${REWARD_SELECT}
          ORDER BY create_time DESC, id DESC
          LIMIT 5`,
      ),
    ]);

    const stat = statRows[0] ?? {};
    const papiStats: TopPapiStat[] = papiRows.map((row) => ({
      papi: String(row.papi),
      players: num(row.players),
      maxValue: num(row.maxValue),
      lastUpdateAt: row.lastUpdateAt
        ? formatDateTime(String(row.lastUpdateAt))
        : null,
    }));

    return {
      totalPapIs: num(stat.totalPapIs),
      totalPlayers: num(stat.totalPlayers),
      totalRecords: num(stat.totalRecords),
      lastUpdateAt: stat.lastUpdateAt
        ? formatDateTime(String(stat.lastUpdateAt))
        : null,
      papiStats,
      recentRewards: rewardRows.map(toRewardEntry),
    };
  });
}

/* ---------- 排行榜（表内 rank 为准，NULL 排名沉底） ---------- */

export async function getTopRanking(
  papi: string,
  page: number,
): Promise<Paginated<TopRankEntry>> {
  const offset = (page - 1) * PAGE_SIZE;

  const [rows, countRows] = await Promise.all([
    query<RowDataPacket[]>(
      `${RANK_SELECT}
        WHERE papi = ?
        ORDER BY (\`rank\` IS NULL) ASC, \`rank\` ASC, id ASC
        LIMIT ? OFFSET ?`,
      [papi, PAGE_SIZE, offset],
    ),
    query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM top_papi_player WHERE papi = ?`,
      [papi],
    ),
  ]);

  return {
    items: rows.map((row, index) => ({
      rank: row.rank === null || row.rank === undefined ? offset + index + 1 : num(row.rank),
      uuid: String(row.playerUuid),
      name: row.playerName ? String(row.playerName) : String(row.playerUuid).slice(0, 8),
      value: num(row.vault),
      updateAt: row.updateAt ? formatDateTime(String(row.updateAt)) : null,
    })),
    total: num(countRows[0]?.total),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 发奖记录（搜索 + papi 筛选 + 分页 + 动态排序） ---------- */

/** ORDER BY 白名单映射：rank/status 用反引号列名，其余是 SELECT 别名。 */
const LOG_SORT_EXPR: Record<TopRewardSortField, string> = {
  name: "playerName",
  papi: "papi",
  rank: "`rank`",
  type: "type",
  status: "status",
  time: "createTime",
};

export async function getTopLogs(input: {
  keyword: string;
  papi: string;
  page: number;
  sort: TopRewardSortField;
  order: SortOrder;
}): Promise<Paginated<TopRewardLogEntry>> {
  const { keyword, papi, page, sort = "time", order = "desc" } = input;
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (keyword) {
    conditions.push("(player_name LIKE ? OR player_uuid LIKE ?)");
    const like = `%${keyword}%`;
    params.push(like, like);
  }
  if (papi) {
    conditions.push("papi = ?");
    params.push(papi);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * PAGE_SIZE;

  const [rows, countRows] = await Promise.all([
    query<RowDataPacket[]>(
      `${REWARD_SELECT}
        ${where}
        ORDER BY ${LOG_SORT_EXPR[sort]} ${order.toUpperCase()}, id DESC
        LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, offset],
    ),
    query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM top_reward_log ${where}`,
      params,
    ),
  ]);

  return {
    items: rows.map(toRewardEntry),
    total: num(countRows[0]?.total),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 玩家排行详情（上榜记录 + 获奖记录） ---------- */

export async function getTopPlayerDetail(
  uuid: string,
): Promise<TopPlayerDetail | null> {
  const [rankRows, rewardRows] = await Promise.all([
    query<RowDataPacket[]>(
      `SELECT papi, \`rank\`, vault, update_time AS updateAt
         FROM top_papi_player
        WHERE player_uuid = ?
        ORDER BY (\`rank\` IS NULL) ASC, \`rank\` ASC, id ASC
        LIMIT 50`,
      [uuid],
    ),
    query<RowDataPacket[]>(
      `${REWARD_SELECT}
        WHERE player_uuid = ?
        ORDER BY create_time DESC, id DESC
        LIMIT 50`,
      [uuid],
    ),
  ]);

  if (rankRows.length === 0 && rewardRows.length === 0) {
    return null;
  }

  const ranks: TopPlayerRankEntry[] = rankRows.map((row, index) => ({
    papi: String(row.papi ?? ""),
    rank:
      row.rank === null || row.rank === undefined ? index + 1 : num(row.rank),
    value: num(row.vault),
    updateAt: row.updateAt ? formatDateTime(String(row.updateAt)) : null,
  }));

  const nameRow =
    rankRows[0] ??
    rewardRows.find((row) => row.playerName) ??
    ({} as RowDataPacket);

  return {
    uuid,
    name: nameRow.playerName ? String(nameRow.playerName) : uuid.slice(0, 8),
    ranks,
    rewards: rewardRows.map(toRewardEntry),
  };
}

/* ---------- 全服玩家详情用的轻量摘要 ---------- */

export async function getTopPlayerSummary(
  uuid: string,
): Promise<TopPlayerSummary | null> {
  const [statRows, bestRows] = await Promise.all([
    query<RowDataPacket[]>(
      `SELECT COUNT(*) AS rankCount,
              MIN(\`rank\`) AS bestRank,
              MAX(update_time) AS lastUpdateAt
         FROM top_papi_player
        WHERE player_uuid = ?`,
      [uuid],
    ),
    query<RowDataPacket[]>(
      `SELECT papi
         FROM top_papi_player
        WHERE player_uuid = ?
        ORDER BY (\`rank\` IS NULL) ASC, \`rank\` ASC, id ASC
        LIMIT 1`,
      [uuid],
    ),
  ]);

  const rankCount = num(statRows[0]?.rankCount);
  if (rankCount === 0) {
    return null;
  }

  return {
    rankCount,
    bestRank:
      statRows[0]?.bestRank === null || statRows[0]?.bestRank === undefined
        ? null
        : num(statRows[0].bestRank),
    bestPapi: bestRows[0]?.papi ? String(bestRows[0].papi) : null,
    lastUpdateAt: statRows[0]?.lastUpdateAt
      ? formatDateTime(String(statRows[0].lastUpdateAt))
      : null,
  };
}
