import type { RowDataPacket } from "mysql2/promise";

import { formatDateTime } from "@/lib/common/format";
import type { Paginated } from "@/lib/common/types";
import {
  warpIdSchema,
  warpListQuerySchema,
  warpPlayersQuerySchema,
  warpUuidSchema,
} from "@/lib/plugins/playerwarp/schemas";
import type {
  WarpChannelEntry,
  WarpCollectionEntry,
  WarpDetail,
  WarpEntry,
  WarpListEntry,
  WarpOverview,
  WarpPlayerDetail,
  WarpPlayerItem,
  WarpPlayerSummary,
  WarpTpRecord,
  WarpWhitelistEntry,
} from "@/lib/plugins/playerwarp/types";
import { query } from "@/lib/server/mysql";

const PAGE_SIZE = 20;

export { warpIdSchema, warpListQuerySchema, warpPlayersQuerySchema, warpUuidSchema };

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
  params?: unknown[],
): Promise<T> {
  if (!(await tableExists(table))) {
    return [] as unknown as T;
  }
  return query<T>(sql, params);
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

/** 地标行 → WarpEntry（列表 / 总览通用）。 */
function toWarpEntry(row: RowDataPacket): WarpEntry {
  return {
    id: Number(row.id),
    name: row.name ? String(row.name) : "未知地标",
    type: row.type ? String(row.type) : null,
    ownerName: row.ownerName ? String(row.ownerName) : String(row.uuid ?? "").slice(0, 8),
    price: Number(row.price ?? 0),
    tpNumber: Number(row.tpNumber ?? 0),
    thermalValue: Number(row.thermalValue ?? 0),
    serverName: row.serverName ? String(row.serverName) : null,
    worldName: row.worldName ? String(row.worldName) : null,
    display: Number(row.display ?? 0) === 1,
    top: isWarpTop(row),
    createTime: row.createTime ? formatDateTime(String(row.createTime)) : null,
    expirationTime: row.expirationTime
      ? formatDateTime(String(row.expirationTime))
      : null,
  };
}

/** 置顶中：有置顶坐标且未过期。 */
function isWarpTop(row: RowDataPacket): boolean {
  if (row.topIndex === null || row.topIndex === undefined) {
    return false;
  }
  if (!row.topTime) {
    return false;
  }
  return new Date(String(row.topTime)).getTime() > Date.now();
}

const WARP_ENTRY_SELECT = `SELECT id, name, type,
       player_name AS ownerName, player_uuid AS uuid,
       price, tp_number AS tpNumber, thermal_value AS thermalValue,
       server_name AS serverName, world_name AS worldName, display,
       top_index AS topIndex, top_time AS topTime,
       create_time AS createTime, expiration_time AS expirationTime
  FROM warp_player`;

export async function getWarpOverview(): Promise<WarpOverview> {
  return cached("overview", async () => {
    const [
      statRows,
      collectionRows,
      likeRows,
      thermalRows,
      tpRows,
      typeRows,
      serverRows,
      latestRows,
    ] = await Promise.all([
      query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN display = 1 THEN 1 ELSE 0 END), 0) AS displayed,
                COALESCE(SUM(tp_number), 0) AS totalTp
           FROM warp_player`,
      ),
      queryIfExists(
        "warp_collection",
        `SELECT COUNT(*) AS total FROM warp_collection`,
      ),
      queryIfExists("warp_like_player", `SELECT COUNT(*) AS total FROM warp_like_player`),
      query<RowDataPacket[]>(
        `SELECT id, name, thermal_value AS thermalValue
           FROM warp_player
          WHERE name IS NOT NULL AND name <> ''
          ORDER BY thermal_value DESC, id DESC
          LIMIT 10`,
      ),
      query<RowDataPacket[]>(
        `SELECT id, name, tp_number AS tpNumber
           FROM warp_player
          WHERE name IS NOT NULL AND name <> ''
          ORDER BY tp_number DESC, id DESC
          LIMIT 10`,
      ),
      query<RowDataPacket[]>(
        `SELECT type AS \`key\`, COUNT(*) AS total
           FROM warp_player
          WHERE type IS NOT NULL AND type <> ''
          GROUP BY type
          ORDER BY total DESC, \`key\` ASC`,
      ),
      query<RowDataPacket[]>(
        `SELECT server_name AS \`key\`, COUNT(*) AS total
           FROM warp_player
          WHERE server_name IS NOT NULL AND server_name <> ''
          GROUP BY server_name
          ORDER BY total DESC, \`key\` ASC`,
      ),
      query<RowDataPacket[]>(
        `${WARP_ENTRY_SELECT}
          WHERE name IS NOT NULL AND name <> ''
          ORDER BY create_time DESC, id DESC
          LIMIT 10`,
      ),
    ]);

    const stat = statRows[0] ?? {};
    return {
      totalWarps: Number(stat.total ?? 0),
      displayedWarps: Number(stat.displayed ?? 0),
      totalTp: Number(stat.totalTp ?? 0),
      totalCollections:
        collectionRows.length > 0 ? Number(collectionRows[0].total ?? 0) : null,
      totalLikes: likeRows.length > 0 ? Number(likeRows[0].total ?? 0) : null,
      thermalRanking: thermalRows.map((row, index) => ({
        rank: index + 1,
        id: Number(row.id),
        name: String(row.name),
        value: Number(row.thermalValue ?? 0),
      })),
      tpRanking: tpRows.map((row, index) => ({
        rank: index + 1,
        id: Number(row.id),
        name: String(row.name),
        value: Number(row.tpNumber ?? 0),
      })),
      typeStats: typeRows.map((row) => ({
        key: String(row.key),
        total: Number(row.total ?? 0),
      })),
      serverStats: serverRows.map((row) => ({
        key: String(row.key),
        total: Number(row.total ?? 0),
      })),
      latestWarps: latestRows.map(toWarpEntry),
    };
  });
}

/* ---------- 玩家列表（搜索 + 服务端分页，按 uuid 聚合） ---------- */

export async function getWarpPlayers(
  keyword: string,
  page: number,
): Promise<Paginated<WarpPlayerItem>> {
  const like = `%${keyword}%`;
  const offset = (page - 1) * PAGE_SIZE;
  const where = keyword ? "WHERE u.name LIKE ?" : "";
  const baseParams = keyword ? [like] : [];

  const rows = await query<RowDataPacket[]>(
    `SELECT u.uuid,
            MAX(u.name) AS name,
            MAX(u.warpCount) AS warpCount,
            MAX(u.displayedCount) AS displayedCount,
            MAX(u.totalTp) AS totalTp,
            MAX(u.totalThermal) AS totalThermal,
            MAX(u.lastCreateAt) AS lastCreateAt
       FROM (
         SELECT player_uuid AS uuid, MAX(player_name) AS name,
                COUNT(*) AS warpCount,
                COALESCE(SUM(CASE WHEN display = 1 THEN 1 ELSE 0 END), 0) AS displayedCount,
                COALESCE(SUM(tp_number), 0) AS totalTp,
                COALESCE(SUM(thermal_value), 0) AS totalThermal,
                MAX(create_time) AS lastCreateAt
           FROM warp_player
          WHERE player_uuid IS NOT NULL
          GROUP BY player_uuid
       ) u
       ${where}
      GROUP BY u.uuid
      ORDER BY lastCreateAt DESC, totalTp DESC, name ASC
      LIMIT ? OFFSET ?`,
    [...baseParams, PAGE_SIZE, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
       FROM (
         SELECT DISTINCT u.uuid, u.name
           FROM (
             SELECT player_uuid AS uuid, MAX(player_name) AS name
               FROM warp_player
              WHERE player_uuid IS NOT NULL
              GROUP BY player_uuid
           ) u
          ${where}
       ) t`,
    baseParams,
  );

  return {
    items: rows.map((row) => ({
      uuid: String(row.uuid),
      name: String(row.name),
      warpCount: Number(row.warpCount ?? 0),
      displayedCount: Number(row.displayedCount ?? 0),
      totalTp: Number(row.totalTp ?? 0),
      totalThermal: Number(row.totalThermal ?? 0),
      lastCreateAt: row.lastCreateAt
        ? formatDateTime(String(row.lastCreateAt))
        : null,
    })),
    total: Number(countRows[0]?.total ?? 0),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 玩家地标详情 ---------- */

export async function getWarpPlayerDetail(
  uuid: string,
): Promise<WarpPlayerDetail | null> {
  const [warpRows, collectionRows, tpRows, channelRows] = await Promise.all([
    query<RowDataPacket[]>(
      `${WARP_ENTRY_SELECT}
        WHERE player_uuid = ?
        ORDER BY create_time DESC, id DESC`,
      [uuid],
    ),
    queryIfExists<RowDataPacket[]>(
      "warp_collection",
      `SELECT w.id AS warpId, w.name, w.server_name AS serverName,
              w.display, w.create_time AS createTime
         FROM warp_collection c
         JOIN warp_player w ON w.id = c.warp_player_id
        WHERE c.player_uuid = ?
        ORDER BY c.id DESC`,
      [uuid],
    ),
    queryIfExists<RowDataPacket[]>(
      "warp_tp_player",
      `SELECT w.id AS warpId, w.name, w.server_name AS serverName,
              t.tp_time AS tpTime
         FROM warp_tp_player t
         JOIN warp_player w ON w.id = t.warp_player_id
        WHERE t.player_uuid = ?
        ORDER BY t.tp_time DESC, t.id DESC`,
      [uuid],
    ),
    queryIfExists<RowDataPacket[]>(
      "warp_channel",
      `SELECT warp_name AS warpName, server_name AS serverName,
              warp_id AS warpId
         FROM warp_channel
        WHERE player_uuid = ?
        ORDER BY id DESC`,
      [uuid],
    ),
  ]);

  if (
    warpRows.length === 0 &&
    collectionRows.length === 0 &&
    tpRows.length === 0 &&
    channelRows.length === 0
  ) {
    return null;
  }

  const collections: WarpCollectionEntry[] = collectionRows.map((row) => ({
    warpId: Number(row.warpId),
    name: row.name ? String(row.name) : "未知地标",
    serverName: row.serverName ? String(row.serverName) : null,
    display: Number(row.display ?? 0) === 1,
    createTime: row.createTime ? formatDateTime(String(row.createTime)) : null,
  }));
  const tpRecords: WarpTpRecord[] = tpRows.map((row) => ({
    warpId: Number(row.warpId),
    name: row.name ? String(row.name) : "未知地标",
    serverName: row.serverName ? String(row.serverName) : null,
    tpTime: row.tpTime ? formatDateTime(String(row.tpTime)) : null,
  }));
  const channels: WarpChannelEntry[] = channelRows.map((row) => ({
    warpName: row.warpName ? String(row.warpName) : null,
    serverName: String(row.serverName),
    warpId: row.warpId === null ? null : Number(row.warpId),
  }));

  return {
    uuid,
    name: await resolveWarpPlayerName(uuid),
    warps: warpRows.map(toWarpEntry),
    collections: collectionRows.length > 0 ? collections : null,
    tpRecords: tpRows.length > 0 ? tpRecords : null,
    channels: channelRows.length > 0 ? channels : null,
  };
}

/* ---------- 地标库（搜索 + 类型/服务器筛选 + 分页） ---------- */

export async function getWarpList(input: {
  keyword: string;
  type: string;
  server: string;
  page: number;
}): Promise<Paginated<WarpListEntry>> {
  const { keyword, type, server, page } = input;
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (keyword) {
    conditions.push("(name LIKE ? OR server_name LIKE ? OR world_name LIKE ? OR type LIKE ?)");
    const like = `%${keyword}%`;
    params.push(like, like, like, like);
  }
  if (type) {
    conditions.push("type = ?");
    params.push(type);
  }
  if (server) {
    conditions.push("server_name = ?");
    params.push(server);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * PAGE_SIZE;

  const rows = await query<RowDataPacket[]>(
    `${WARP_ENTRY_SELECT}
      ${where}
      ORDER BY CASE WHEN top_time > NOW() THEN 1 ELSE 0 END DESC,
               create_time DESC, id DESC
      LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM warp_player ${where}`,
    params,
  );

  return {
    items: rows.map((row) => toWarpListEntry(row)),
    total: Number(countRows[0]?.total ?? 0),
    page,
    pageSize: PAGE_SIZE,
  };
}

function toWarpListEntry(row: RowDataPacket): WarpListEntry {
  const entry = toWarpEntry(row);
  return {
    id: entry.id,
    name: entry.name,
    type: entry.type,
    ownerName: entry.ownerName,
    price: entry.price,
    tpNumber: entry.tpNumber,
    thermalValue: entry.thermalValue,
    serverName: entry.serverName,
    worldName: entry.worldName,
    display: entry.display,
    top: entry.top,
    createTime: entry.createTime,
    expirationTime: entry.expirationTime,
  };
}

/* ---------- 单个地标详情 ---------- */

export async function getWarpDetail(id: number): Promise<WarpDetail | null> {
  const [mainRows, collectionRows, likeRows, whiteRows, tpRows] =
    await Promise.all([
      query<RowDataPacket[]>(
        `${WARP_ENTRY_SELECT}
          WHERE id = ?
          LIMIT 1`,
        [id],
      ),
      queryIfExists<RowDataPacket[]>(
        "warp_collection",
        `SELECT COUNT(*) AS total FROM warp_collection WHERE warp_player_id = ?`,
        [id],
      ),
      queryIfExists<RowDataPacket[]>(
        "warp_like_player",
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(\`like\`), 0) AS sumLike,
                COALESCE(AVG(\`like\`), 0) AS avgLike
           FROM warp_like_player
          WHERE warp_player_id = ?`,
        [id],
      ),
      queryIfExists<RowDataPacket[]>(
        "warp_white_list",
        `SELECT player_name AS playerName
           FROM warp_white_list
          WHERE warp_player_id = ?
          ORDER BY id ASC`,
        [id],
      ),
      queryIfExists<RowDataPacket[]>(
        "warp_tp_player",
        `SELECT player_uuid AS playerUuid, player_name AS playerName,
                tp_time AS tpTime
           FROM warp_tp_player
          WHERE warp_player_id = ?
          ORDER BY tp_time DESC, id DESC
          LIMIT 20`,
        [id],
      ),
    ]);

  const main = mainRows[0];
  if (!main) {
    return null;
  }

  const likeStat = likeRows[0];
  const whitelist: WarpWhitelistEntry[] = whiteRows.map((row) => ({
    playerName: row.playerName ? String(row.playerName) : "未知玩家",
  }));
  const recentTp: WarpTpRecord[] = tpRows.map((row) => ({
    warpId: id,
    name: main.name ? String(main.name) : "未知地标",
    serverName: main.serverName ? String(main.serverName) : null,
    playerUuid: row.playerUuid ? String(row.playerUuid) : undefined,
    playerName: row.playerName ? String(row.playerName) : undefined,
    tpTime: row.tpTime ? formatDateTime(String(row.tpTime)) : null,
  }));

  return {
    id,
    name: main.name ? String(main.name) : "未知地标",
    type: main.type ? String(main.type) : null,
    description: main.description ? String(main.description) : null,
    ownerUuid: String(main.uuid ?? ""),
    ownerName: main.ownerName ? String(main.ownerName) : "未知玩家",
    price: Number(main.price ?? 0),
    tpNumber: Number(main.tpNumber ?? 0),
    thermalValue: Number(main.thermalValue ?? 0),
    serverName: main.serverName ? String(main.serverName) : null,
    worldName: main.worldName ? String(main.worldName) : null,
    warpLocation: main.warpLocation ? String(main.warpLocation) : null,
    display: Number(main.display ?? 0) === 1,
    top: isWarpTop(main),
    creator: main.creator ? String(main.creator) : null,
    createTime: main.createTime ? formatDateTime(String(main.createTime)) : null,
    expirationTime: main.expirationTime
      ? formatDateTime(String(main.expirationTime))
      : null,
    collectionCount:
      collectionRows.length > 0 ? Number(collectionRows[0].total ?? 0) : null,
    likeCount: likeStat ? Number(likeStat.total ?? 0) : null,
    avgLike: likeStat ? Number(likeStat.avgLike ?? 0) : null,
    whitelist: whiteRows.length > 0 ? whitelist : null,
    recentTp: tpRows.length > 0 ? recentTp : null,
  };
}

/* ---------- 全服玩家详情用的轻量摘要 ---------- */

export async function getWarpPlayerSummary(
  uuid: string,
): Promise<WarpPlayerSummary | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS warpCount,
            COALESCE(SUM(CASE WHEN display = 1 THEN 1 ELSE 0 END), 0) AS displayedCount,
            COALESCE(SUM(tp_number), 0) AS totalTp,
            MAX(create_time) AS lastCreateAt
       FROM warp_player
      WHERE player_uuid = ?`,
    [uuid],
  );
  const row = rows[0];
  if (!row || Number(row.warpCount ?? 0) === 0) {
    return null;
  }
  return {
    warpCount: Number(row.warpCount ?? 0),
    displayedCount: Number(row.displayedCount ?? 0),
    totalTp: Number(row.totalTp ?? 0),
    lastCreateAt: row.lastCreateAt
      ? formatDateTime(String(row.lastCreateAt))
      : null,
  };
}

async function resolveWarpPlayerName(uuid: string): Promise<string> {
  const rows = await query<RowDataPacket[]>(
    `SELECT player_name AS name FROM warp_player
      WHERE player_uuid = ? AND player_name IS NOT NULL
      LIMIT 1`,
    [uuid],
  );
  return rows[0]?.name ? String(rows[0].name) : uuid.slice(0, 8);
}
