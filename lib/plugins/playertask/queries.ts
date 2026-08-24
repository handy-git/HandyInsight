import type { RowDataPacket } from "mysql2/promise";

import { formatDateTime } from "@/lib/common/format";
import type { Paginated } from "@/lib/common/types";
import {
  taskPlayersQuerySchema,
  taskUuidSchema,
} from "@/lib/plugins/playertask/schemas";
import type {
  NpcTaskEntry,
  ShopItemEntry,
  TaskCategory,
  TaskLibrary,
  TaskLibraryEntry,
  TaskOverview,
  TaskPlayerDetail,
  TaskPlayerItem,
  TaskPlayerSummary,
  TaskPoolEntry,
  TaskRecord,
} from "@/lib/plugins/playertask/types";
import { query } from "@/lib/server/mysql";

const PAGE_SIZE = 20;

export { taskPlayersQuerySchema, taskUuidSchema };

/* ---------- 工具：可选表探测（30 秒缓存，缺表则区块降级） ---------- */

const tableCache = new Map<string, { exists: boolean; expiresAt: number }>();

async function tableExists(table: string): Promise<boolean> {
  const hit = tableCache.get(table);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.exists;
  }
  let exists = false;
  try {
    await query<RowDataPacket[]>(`SELECT 1 FROM \`${table}\` LIMIT 1`);
    exists = true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code !== "ER_NO_SUCH_TABLE") {
      throw error;
    }
  }
  tableCache.set(table, { exists, expiresAt: Date.now() + 30_000 });
  return exists;
}

/** 可选表存在时执行查询，否则返回空数组（区块降级）。 */
async function queryIfExists<T extends RowDataPacket[]>(
  table: string,
  sql: string,
): Promise<T> {
  if (!(await tableExists(table))) {
    return [] as unknown as T;
  }
  return query<T>(sql);
}

/* ---------- 总览：30 秒进程内缓存 ---------- */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value;
  }
  const value = await loader();
  cache.set(key, { value, expiresAt: Date.now() + 30_000 });
  return value;
}

const TYPE_LABELS: Record<TaskCategory, string> = {
  daily: "每日任务",
  npc: "NPC任务",
  reel: "卷轴任务",
};

export async function getTaskOverview(): Promise<TaskOverview> {
  return cached("overview", async () => {
    const [coinRows, todayRows, activeRows, typeRows, rarityRows, rankRows, recentRows] =
      await Promise.all([
        query<RowDataPacket[]>(
          `SELECT COUNT(*) AS players,
                  COALESCE(SUM(amount), 0) AS coins
             FROM task_coin
            WHERE player_uuid IS NOT NULL`,
        ),
        query<RowDataPacket[]>(
          `SELECT
             (SELECT COUNT(*) FROM task_player
               WHERE status = 1 AND task_date >= CURDATE()) AS daily,
             (SELECT COUNT(*) FROM task_npc_player
               WHERE status = 1 AND task_date >= CURDATE()) AS npc`,
        ),
        query<RowDataPacket[]>(
          `SELECT COUNT(DISTINCT uuid) AS total FROM (
             SELECT player_uuid AS uuid FROM task_player
              WHERE task_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
             UNION
             SELECT player_uuid FROM task_npc_player
              WHERE task_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
           ) t`,
        ),
        query<RowDataPacket[]>(
          `SELECT 'daily' AS category, COUNT(*) AS total,
                  COALESCE(SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END), 0) AS completed
             FROM task_player
           UNION ALL
           SELECT 'npc', COUNT(*), COALESCE(SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END), 0)
             FROM task_npc_player
           UNION ALL
           SELECT 'reel', COUNT(*), COALESCE(SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END), 0)
             FROM task_reel`,
        ),
        query<RowDataPacket[]>(
          `SELECT rarity, COUNT(*) AS total
             FROM task_reel
            WHERE rarity IS NOT NULL AND rarity <> ''
            GROUP BY rarity
            ORDER BY total DESC, rarity ASC`,
        ),
        query<RowDataPacket[]>(
          `SELECT player_uuid AS uuid, MAX(player_name) AS name,
                  MAX(amount) AS coins
             FROM task_coin
            WHERE player_uuid IS NOT NULL
            GROUP BY player_uuid
            ORDER BY coins DESC, name ASC
            LIMIT 10`,
        ),
        query<RowDataPacket[]>(
          `SELECT * FROM (
             SELECT player_uuid AS uuid, player_name AS name,
                    task_name AS taskName, 'daily' AS category,
                    status, task_date AS taskDate
               FROM task_player
             UNION ALL
             SELECT player_uuid, player_name, task_name, 'npc',
                    status, task_date
               FROM task_npc_player
           ) t
           WHERE taskDate IS NOT NULL
           ORDER BY taskDate DESC
           LIMIT 20`,
        ),
      ]);

    const coin = coinRows[0] ?? {};
    const today = todayRows[0] ?? {};
    const typeStats = typeRows.map((row) => ({
      category: String(row.category) as TaskCategory,
      label: TYPE_LABELS[String(row.category) as TaskCategory] ?? String(row.category),
      total: Number(row.total ?? 0),
      completed: Number(row.completed ?? 0),
    }));

    return {
      coinPlayers: Number(coin.players ?? 0),
      totalCoins: Number(coin.coins ?? 0),
      todayCompleted:
        Number(today.daily ?? 0) + Number(today.npc ?? 0),
      activePlayers: Number(activeRows[0]?.total ?? 0),
      typeStats,
      rarityStats: rarityRows.map((row) => ({
        rarity: String(row.rarity),
        total: Number(row.total ?? 0),
      })),
      coinRanking: rankRows.map((row, index) => ({
        rank: index + 1,
        uuid: String(row.uuid),
        name: row.name ? String(row.name) : String(row.uuid).slice(0, 8),
        coins: Number(row.coins ?? 0),
      })),
      recentTasks: recentRows.map((row) => ({
        uuid: String(row.uuid),
        name: row.name ? String(row.name) : String(row.uuid).slice(0, 8),
        taskName: row.taskName ? String(row.taskName) : "未知任务",
        category: String(row.category) as TaskCategory,
        completed: Number(row.status ?? 0) === 1,
        taskDate: formatDateTime(String(row.taskDate)),
      })),
    };
  });
}

/* ---------- 玩家列表（搜索 + 服务端分页，按 uuid 批量聚合） ---------- */

export async function getTaskPlayers(
  keyword: string,
  page: number,
): Promise<Paginated<TaskPlayerItem>> {
  const like = `%${keyword}%`;
  const offset = (page - 1) * PAGE_SIZE;
  const where = keyword ? "WHERE u.name LIKE ?" : "";
  const baseParams = keyword ? [like] : [];

  const rows = await query<RowDataPacket[]>(
    `SELECT u.uuid,
            MAX(u.name) AS name,
            MAX(u.coins) AS coins,
            SUM(u.dailyCompleted) AS dailyCompleted,
            SUM(u.npcCompleted) AS npcCompleted,
            SUM(u.reelCompleted) AS reelCompleted,
            MAX(u.lastTaskAt) AS lastTaskAt
       FROM (
         SELECT player_uuid AS uuid, MAX(player_name) AS name,
                MAX(amount) AS coins,
                0 AS dailyCompleted, 0 AS npcCompleted, 0 AS reelCompleted,
                NULL AS lastTaskAt
           FROM task_coin
          WHERE player_uuid IS NOT NULL
          GROUP BY player_uuid
         UNION ALL
         SELECT player_uuid, MAX(player_name), NULL,
                COUNT(*), 0, 0, MAX(task_date)
           FROM task_player
          WHERE player_uuid IS NOT NULL
          GROUP BY player_uuid
         UNION ALL
         SELECT player_uuid, MAX(player_name), NULL,
                0, COUNT(*), 0, MAX(task_date)
           FROM task_npc_player
          WHERE player_uuid IS NOT NULL
          GROUP BY player_uuid
         UNION ALL
         SELECT player_uuid, MAX(player_name), NULL,
                0, 0, COUNT(*), NULL
           FROM task_reel
          WHERE player_uuid IS NOT NULL
          GROUP BY player_uuid
       ) u
       ${where}
      GROUP BY u.uuid
      ORDER BY lastTaskAt DESC, coins DESC, name ASC
      LIMIT ? OFFSET ?`,
    [...baseParams, PAGE_SIZE, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
       FROM (
         SELECT DISTINCT u.uuid, u.name
           FROM (
             SELECT player_uuid AS uuid, player_name AS name FROM task_coin
              WHERE player_uuid IS NOT NULL
             UNION ALL
             SELECT player_uuid, player_name FROM task_player
              WHERE player_uuid IS NOT NULL
             UNION ALL
             SELECT player_uuid, player_name FROM task_npc_player
              WHERE player_uuid IS NOT NULL
             UNION ALL
             SELECT player_uuid, player_name FROM task_reel
              WHERE player_uuid IS NOT NULL
           ) u
          ${where}
       ) t`,
    baseParams,
  );

  return {
    items: rows.map((row) => ({
      uuid: String(row.uuid),
      name: String(row.name),
      coins:
        row.coins === null || row.coins === undefined
          ? null
          : Number(row.coins),
      dailyCompleted: Number(row.dailyCompleted ?? 0),
      npcCompleted: Number(row.npcCompleted ?? 0),
      reelCompleted: Number(row.reelCompleted ?? 0),
      lastTaskAt: row.lastTaskAt
        ? formatDateTime(String(row.lastTaskAt))
        : null,
    })),
    total: Number(countRows[0]?.total ?? 0),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 玩家任务详情 ---------- */

export async function getTaskPlayerDetail(
  uuid: string,
): Promise<TaskPlayerDetail | null> {
  const [coinRows, dailyRows, npcRows, reelRows] = await Promise.all([
    query<RowDataPacket[]>(
      `SELECT amount, last_join_time AS lastJoinTime, last_quit_time AS lastQuitTime
         FROM task_coin
        WHERE player_uuid = ?
        LIMIT 1`,
      [uuid],
    ),
    query<RowDataPacket[]>(
      `SELECT id, task_id AS taskId, task_name AS taskName,
              task_demand AS taskDemand, task_rewards AS taskRewards,
              task_date AS taskDate, status, refresh
         FROM task_player
        WHERE player_uuid = ?
        ORDER BY task_date DESC, id DESC`,
      [uuid],
    ),
    query<RowDataPacket[]>(
      `SELECT id, task_npc_id AS taskNpcId, task_id AS taskId,
              npc_id AS npcId, task_name AS taskName,
              task_demand AS taskDemand, task_rewards AS taskRewards,
              task_date AS taskDate, status, number
         FROM task_npc_player
        WHERE player_uuid = ?
        ORDER BY task_date DESC, id DESC`,
      [uuid],
    ),
    query<RowDataPacket[]>(
      `SELECT id, task_id AS taskId, task_name AS taskName,
              task_demand AS taskDemand, task_rewards AS taskRewards,
              rarity, status, description
         FROM task_reel
        WHERE player_uuid = ?
        ORDER BY id DESC`,
      [uuid],
    ),
  ]);

  if (
    coinRows.length === 0 &&
    dailyRows.length === 0 &&
    npcRows.length === 0 &&
    reelRows.length === 0
  ) {
    return null;
  }

  const [dailyDemands, npcDemands, reelDemands] = await Promise.all([
    loadDemands(
      "task_player_demand",
      "task_player_id",
      "taskDate",
      uuid,
    ),
    loadDemands(
      "task_npc_player_demand",
      "task_npc_player_id",
      "description",
      uuid,
    ),
    loadDemands(
      "task_reel_player_demand",
      "reel_id",
      "description",
      uuid,
    ),
  ]);

  const coin = coinRows[0] ?? {};
  return {
    uuid,
    name: await resolveTaskPlayerName(uuid),
    coins:
      coin.amount === null || coin.amount === undefined
        ? null
        : Number(coin.amount),
    lastJoinTime: coin.lastJoinTime
      ? formatDateTime(String(coin.lastJoinTime))
      : null,
    lastQuitTime: coin.lastQuitTime
      ? formatDateTime(String(coin.lastQuitTime))
      : null,
    daily: dailyRows.map((row) => ({
      id: Number(row.id),
      taskId: row.taskId === null ? null : Number(row.taskId),
      taskName: row.taskName ? String(row.taskName) : "未知任务",
      taskDemand: row.taskDemand ? String(row.taskDemand) : null,
      taskRewards: row.taskRewards ? String(row.taskRewards) : null,
      taskDate: row.taskDate ? formatDateTime(String(row.taskDate)) : null,
      status: Number(row.status ?? 0),
      completed: Number(row.status ?? 0) === 1,
      refresh: row.refresh === null ? null : Number(row.refresh),
      demands: dailyDemands.get(Number(row.id)) ?? [],
    })),
    npc: npcRows.map((row) => ({
      id: Number(row.id),
      taskId: row.taskId === null ? null : Number(row.taskId),
      taskName: row.taskName ? String(row.taskName) : "未知任务",
      taskDemand: row.taskDemand ? String(row.taskDemand) : null,
      taskRewards: row.taskRewards ? String(row.taskRewards) : null,
      taskDate: row.taskDate ? formatDateTime(String(row.taskDate)) : null,
      status: Number(row.status ?? 0),
      completed: Number(row.status ?? 0) === 1,
      claimCount: row.number === null ? null : Number(row.number),
      demands: npcDemands.get(Number(row.id)) ?? [],
    })),
    reel: reelRows.map((row) => ({
      id: Number(row.id),
      taskId: row.taskId === null ? null : Number(row.taskId),
      taskName: row.taskName ? String(row.taskName) : "未知任务",
      taskDemand: row.taskDemand ? String(row.taskDemand) : null,
      taskRewards: row.taskRewards ? String(row.taskRewards) : null,
      taskDate: null,
      status: Number(row.status ?? 0),
      completed: Number(row.status ?? 0) === 1,
      rarity: row.rarity ? String(row.rarity) : null,
      demands: reelDemands.get(Number(row.id)) ?? [],
    })),
  };
}

interface DemandRow {
  key: number;
  type: string | null;
  completionAmount: number;
  amount: number;
  description: string | null;
}

/**
 * 加载某类任务的进度明细并按外键分组。
 * 明细表为可选表，缺失时返回空 Map（区块降级）。
 */
async function loadDemands(
  table: string,
  keyColumn: string,
  descriptionColumn: string,
  uuid: string,
): Promise<Map<number, TaskRecord["demands"]>> {
  if (!(await tableExists(table))) {
    return new Map();
  }
  const rows = await query<RowDataPacket[]>(
    `SELECT \`${keyColumn}\` AS keyId, type,
            completion_amount AS completionAmount, amount,
            \`${descriptionColumn}\` AS description
       FROM \`${table}\`
      WHERE player_uuid = ?`,
    [uuid],
  );
  const grouped = new Map<number, DemandRow[]>();
  for (const row of rows as DemandRow[]) {
    const key = Number(row.key);
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }
  return new Map(
    [...grouped.entries()].map(([key, list]) => [
      key,
      list.map((row) => ({
        type: row.type ? String(row.type) : null,
        completionAmount: Number(row.completionAmount ?? 0),
        amount: Number(row.amount ?? 0),
        description: row.description ? String(row.description) : null,
      })),
    ]),
  );
}

/** 全服玩家详情用的轻量摘要。 */
export async function getTaskPlayerSummary(
  uuid: string,
): Promise<TaskPlayerSummary | null> {
  const [coinRows, dailyRows, npcRows, reelRows] = await Promise.all([
    query<RowDataPacket[]>(
      `SELECT amount FROM task_coin WHERE player_uuid = ? LIMIT 1`,
      [uuid],
    ),
    query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total, MAX(task_date) AS lastTaskAt
         FROM task_player
        WHERE player_uuid = ? AND status = 1`,
      [uuid],
    ),
    query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total, MAX(task_date) AS lastTaskAt
         FROM task_npc_player
        WHERE player_uuid = ? AND status = 1`,
      [uuid],
    ),
    query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
         FROM task_reel
        WHERE player_uuid = ? AND status = 1`,
      [uuid],
    ),
  ]);

  const hasCoin = coinRows.length > 0;
  const dailyTotal = Number(dailyRows[0]?.total ?? 0);
  const npcTotal = Number(npcRows[0]?.total ?? 0);
  const reelTotal = Number(reelRows[0]?.total ?? 0);
  if (!hasCoin && dailyTotal === 0 && npcTotal === 0 && reelTotal === 0) {
    return null;
  }

  const lastTaskAt = [dailyRows[0]?.lastTaskAt, npcRows[0]?.lastTaskAt]
    .filter(Boolean)
    .map(String)
    .sort()
    .at(-1);
  return {
    coins:
      coinRows[0]?.amount === null || coinRows[0]?.amount === undefined
        ? null
        : Number(coinRows[0].amount),
    dailyCompleted: dailyTotal,
    npcCompleted: npcTotal,
    reelCompleted: reelTotal,
    lastTaskAt: lastTaskAt ? formatDateTime(lastTaskAt) : null,
  };
}

/* ---------- 任务库（静态配置，30 秒缓存） ---------- */

export async function getTaskLibrary(): Promise<TaskLibrary> {
  return cached("library", async () => {
    const [taskRows, npcRows, shopRows, demandRows, rewardRows] =
      await Promise.all([
        queryIfExists(
          "task_list",
          `SELECT id, task_name AS taskName, task_demand AS taskDemand,
                  task_rewards AS taskRewards, type, rarity,
                  description, enable_command AS enableCommand
             FROM task_list
            ORDER BY id`,
        ),
        queryIfExists(
          "task_npc",
          `SELECT id, task_id AS taskId, task_name AS taskName,
                  parent_id AS parentId, npc_id AS npcId,
                  is_ever AS isEver, number, cd
             FROM task_npc
            ORDER BY id`,
        ),
        queryIfExists(
          "task_shop",
          `SELECT id, type, amount, item_stack AS itemStack
             FROM task_shop
            ORDER BY id`,
        ),
        queryIfExists(
          "task_demand",
          `SELECT id, type, amount, description
             FROM task_demand
            ORDER BY id`,
        ),
        queryIfExists(
          "task_rewards",
          `SELECT id, type, amount, description
             FROM task_rewards
            ORDER BY id`,
        ),
      ]);

    const tasks: TaskLibraryEntry[] = taskRows.map((row) => ({
      id: Number(row.id),
      taskName: row.taskName ? String(row.taskName) : "未知任务",
      taskDemand: row.taskDemand ? String(row.taskDemand) : null,
      taskRewards: row.taskRewards ? String(row.taskRewards) : null,
      type: row.type ? String(row.type) : null,
      rarity: row.rarity ? String(row.rarity) : null,
      description: row.description ? String(row.description) : null,
      enableCommand: row.enableCommand ? String(row.enableCommand) : null,
    }));

    // 前置任务名称映射（parentId → taskName）
    const npcIdToName = new Map<number, string>();
    for (const row of npcRows) {
      if (row.id !== null && row.id !== undefined) {
        npcIdToName.set(Number(row.id), row.taskName ? String(row.taskName) : "");
      }
    }
    const npcTasks: NpcTaskEntry[] = npcRows.map((row) => {
      const parentId = row.parentId === null ? null : Number(row.parentId);
      return {
        id: Number(row.id),
        taskId: row.taskId === null ? null : Number(row.taskId),
        taskName: row.taskName ? String(row.taskName) : null,
        parentId,
        parentName: parentId === null ? null : (npcIdToName.get(parentId) ?? null),
        npcId: row.npcId ? String(row.npcId) : null,
        isEver: Number(row.isEver ?? 0) === 1,
        number: row.number === null ? null : Number(row.number),
        cdSeconds: row.cd === null ? null : Number(row.cd),
      };
    });

    const shopItems: ShopItemEntry[] = shopRows.map((row) => ({
      id: Number(row.id),
      type: row.type ? String(row.type) : null,
      amount: row.amount === null ? null : Number(row.amount),
      itemStack: row.itemStack ? String(row.itemStack) : null,
    }));

    const toPool = (rows: RowDataPacket[]): TaskPoolEntry[] =>
      rows.map((row) => ({
        id: Number(row.id),
        type: row.type ? String(row.type) : null,
        amount: row.amount === null ? null : Number(row.amount),
        description: row.description ? String(row.description) : null,
      }));

    return {
      tasks,
      npcTasks,
      shopItems,
      demandPool: toPool(demandRows),
      rewardPool: toPool(rewardRows),
    };
  });
}

async function resolveTaskPlayerName(uuid: string): Promise<string> {
  const rows = await query<RowDataPacket[]>(
    `SELECT player_name AS name FROM task_coin
      WHERE player_uuid = ? AND player_name IS NOT NULL
      LIMIT 1`,
    [uuid],
  );
  return rows[0]?.name ? String(rows[0].name) : uuid.slice(0, 8);
}
