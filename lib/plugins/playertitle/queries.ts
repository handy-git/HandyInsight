import { addDays, format } from "date-fns";
import type { RowDataPacket } from "mysql2/promise";

import { formatDateTime, num } from "@/lib/common/format";
import type { SortOrder } from "@/lib/common/sort";
import type { Paginated } from "@/lib/common/types";
import {
  titleListQuerySchema,
  titlePlayersQuerySchema,
  titleUuidSchema,
} from "@/lib/plugins/playertitle/schemas";
import type {
  TitleCoinRankEntry,
  TitleListItem,
  TitleListSortField,
  TitleOverview,
  TitlePlayerDetail,
  TitlePlayerItem,
  TitlePlayerSortField,
  TitlePlayerTitle,
  TitleRankEntry,
} from "@/lib/plugins/playertitle/types";
import { createCache } from "@/lib/server/cache";
import { query } from "@/lib/server/mysql";

const PAGE_SIZE = 20;

/** SQL 参数用的日期字符串。 */
function toSqlDateTime(date: Date): string {
  return format(date, "yyyy-MM-dd HH:mm:ss");
}

export { titleListQuerySchema, titlePlayersQuerySchema, titleUuidSchema };

/* ---------- 总览与排行：30 秒进程内缓存（共享实现，命名空间隔离） ---------- */

const cached = createCache("playertitle");

export async function getTitleOverview(): Promise<TitleOverview> {
  return cached("overview", async () => {
    const rows = await query<RowDataPacket[]>(
      `SELECT
         (SELECT COUNT(*) FROM title_list WHERE is_hide = 0) AS totalTitles,
         (SELECT COUNT(DISTINCT player_uuid) FROM title_player WHERE player_uuid IS NOT NULL) AS totalPlayers,
         (SELECT COUNT(DISTINCT player_uuid) FROM title_player WHERE is_use = 1) AS usingPlayers,
         (SELECT COALESCE(SUM(amount), 0) FROM title_coin) AS totalCoins`,
    );
    const row = rows[0] ?? {};
    return {
      totalTitles: num(row.totalTitles),
      totalPlayers: num(row.totalPlayers),
      usingPlayers: num(row.usingPlayers),
      totalCoins: num(row.totalCoins),
    };
  });
}

/** 热门称号排行（按持有玩家数）。 */
export async function getTitleRanking(): Promise<TitleRankEntry[]> {
  return cached("ranking", async () => {
    const rows = await query<RowDataPacket[]>(
      `SELECT title_id AS titleId, title_name AS titleName,
              COUNT(DISTINCT player_uuid) AS players
         FROM title_player
        WHERE player_uuid IS NOT NULL
        GROUP BY title_id, title_name
        ORDER BY players DESC, titleName ASC
        LIMIT 20`,
    );
    return rows.map((row, index) => ({
      rank: index + 1,
      titleId: row.titleId === null ? null : Number(row.titleId),
      titleName: String(row.titleName),
      players: Number(row.players),
    }));
  });
}

/** 称号币排行。 */
export async function getTitleCoinRanking(): Promise<TitleCoinRankEntry[]> {
  return cached("coin-ranking", async () => {
    const rows = await query<RowDataPacket[]>(
      `SELECT player_uuid AS uuid, player_name AS name, amount
         FROM title_coin
        ORDER BY amount DESC, name ASC
        LIMIT 20`,
    );
    return rows.map((row, index) => ({
      rank: index + 1,
      uuid: row.uuid ? String(row.uuid) : null,
      name: String(row.name),
      coins: num(row.amount),
    }));
  });
}

/* ---------- 称号库（分页 + 搜索 + 动态排序） ---------- */

/** ORDER BY 白名单映射：全部是 SELECT 里的别名。 */
const LIST_SORT_EXPR: Record<TitleListSortField, string> = {
  name: "titleName",
  price: "amount",
  day: "day",
  position: "position",
};

export async function getTitleList(
  keyword: string,
  page: number,
  sort: TitleListSortField = "position",
  order: SortOrder = "asc",
): Promise<Paginated<TitleListItem>> {
  const like = `%${keyword}%`;
  const offset = (page - 1) * PAGE_SIZE;
  const where = keyword ? "WHERE tl.title_name LIKE ?" : "";
  const baseParams = keyword ? [like] : [];

  const rows = await query<RowDataPacket[]>(
    `SELECT tl.id, tl.title_name AS titleName, tl.buy_type AS buyType,
            tl.amount, tl.day, tl.is_hide AS isHide,
            tl.description, tl.position,
            (SELECT GROUP_CONCAT(buff_type) FROM title_buff tb
              WHERE tb.title_id = tl.id) AS buffTypes,
            (SELECT tp.particle_type FROM title_particle tp
              WHERE tp.title_id = tl.id LIMIT 1) AS particleType
       FROM title_list tl
       ${where}
      ORDER BY ${LIST_SORT_EXPR[sort]} ${order.toUpperCase()}, tl.id ASC
      LIMIT ? OFFSET ?`,
    [...baseParams, PAGE_SIZE, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM title_list tl ${where}`,
    baseParams,
  );

  return {
    items: rows.map((row) => ({
      id: Number(row.id),
      titleName: String(row.titleName),
      buyType: row.buyType ? String(row.buyType) : null,
      amount: row.amount === null || row.amount === undefined ? null : Number(row.amount),
      day: num(row.day),
      isHide: num(row.isHide) === 1,
      description: row.description ? String(row.description) : null,
      position: num(row.position),
      particleType: row.particleType ? String(row.particleType) : null,
      buffTypes: row.buffTypes
        ? String(row.buffTypes)
            .split(",")
            .filter(Boolean)
        : [],
    })),
    total: num(countRows[0]?.total),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 称号玩家列表（搜索 + 服务端分页 + 动态排序，批量聚合） ---------- */

/** ORDER BY 白名单映射：全部是外层 GROUP BY 后 SELECT 里的别名。 */
const PLAYER_SORT_EXPR: Record<TitlePlayerSortField, string> = {
  name: "name",
  count: "titleCount",
  coins: "coins",
};

export async function getTitlePlayers(
  keyword: string,
  page: number,
  sort: TitlePlayerSortField = "count",
  order: SortOrder = "desc",
): Promise<Paginated<TitlePlayerItem>> {
  const like = `%${keyword}%`;
  const offset = (page - 1) * PAGE_SIZE;
  const where = keyword ? "WHERE u.name LIKE ?" : "";
  const baseParams = keyword ? [like] : [];

  const rows = await query<RowDataPacket[]>(
    `SELECT u.uuid,
            MAX(u.name) AS name,
            SUM(u.titles) AS titleCount,
            MAX(u.coins) AS coins,
            MAX(u.usingTitle) AS usingTitle
       FROM (
         SELECT player_uuid AS uuid, MAX(player_name) AS name,
                COUNT(*) AS titles, NULL AS coins,
                MAX(CASE WHEN is_use = 1 THEN title_name END) AS usingTitle
           FROM title_player
          WHERE player_uuid IS NOT NULL
          GROUP BY player_uuid
         UNION ALL
         SELECT player_uuid, MAX(player_name), 0, MAX(amount), NULL
           FROM title_coin
          WHERE player_uuid IS NOT NULL
          GROUP BY player_uuid
       ) u
       ${where}
      GROUP BY u.uuid
      ORDER BY ${PLAYER_SORT_EXPR[sort]} ${order.toUpperCase()}, name ASC
      LIMIT ? OFFSET ?`,
    [...baseParams, PAGE_SIZE, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
       FROM (
         SELECT DISTINCT u.uuid, u.name
           FROM (
             SELECT player_uuid AS uuid, player_name AS name
               FROM title_player
              WHERE player_uuid IS NOT NULL
             UNION ALL
             SELECT player_uuid, player_name
               FROM title_coin
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
      titleCount: num(row.titleCount),
      usingTitle: row.usingTitle ? String(row.usingTitle) : null,
      coins: row.coins === null || row.coins === undefined ? null : Number(row.coins),
    })),
    total: num(countRows[0]?.total),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 玩家称号详情 ---------- */

export async function getTitlePlayerDetail(
  uuid: string,
): Promise<TitlePlayerDetail | null> {
  const now = new Date();
  const soonThreshold = toSqlDateTime(addDays(now, 7));
  const nowText = toSqlDateTime(now);

  const [titleRows, coinRows] = await Promise.all([
    query<RowDataPacket[]>(
      `SELECT title_id AS titleId, title_name AS titleName,
              expiration_time AS expirationTime,
              is_use AS isUse, is_use_buff AS isUseBuff,
              is_use_particle AS isUseParticle
         FROM title_player
        WHERE player_uuid = ?
        ORDER BY is_use DESC, expiration_time ASC, titleName ASC`,
      [uuid],
    ),
    query<RowDataPacket[]>(
      `SELECT amount FROM title_coin WHERE player_uuid = ? LIMIT 1`,
      [uuid],
    ),
  ]);

  if (titleRows.length === 0 && coinRows.length === 0) {
    return null;
  }

  const titles: TitlePlayerTitle[] = titleRows.map((row) => {
    const expirationTime = formatDateTime(String(row.expirationTime));
    return {
      titleId: row.titleId === null ? null : Number(row.titleId),
      titleName: String(row.titleName),
      expirationTime,
      isUse: num(row.isUse) === 1,
      isUseBuff: num(row.isUseBuff) === 1,
      isUseParticle: num(row.isUseParticle) === 1,
      expired: expirationTime < nowText,
      expiringSoon:
        expirationTime >= nowText && expirationTime < soonThreshold,
    };
  });

  return {
    uuid,
    name: await resolveTitlePlayerName(uuid),
    usingTitle: titles.find((title) => title.isUse)?.titleName ?? null,
    coins:
      coinRows[0]?.amount === null || coinRows[0]?.amount === undefined
        ? null
        : Number(coinRows[0].amount),
    titles,
  };
}

/** 全服玩家详情用的轻量摘要。 */
export async function getTitlePlayerSummary(
  uuid: string,
): Promise<{
  usingTitle: string | null;
  titleCount: number;
  coins: number | null;
} | null> {
  const [rows, coinRows] = await Promise.all([
    query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total,
              MAX(CASE WHEN is_use = 1 THEN title_name END) AS usingTitle
         FROM title_player
        WHERE player_uuid = ?`,
      [uuid],
    ),
    query<RowDataPacket[]>(
      `SELECT amount FROM title_coin WHERE player_uuid = ? LIMIT 1`,
      [uuid],
    ),
  ]);
  const total = num(rows[0]?.total);
  if (total === 0 && coinRows.length === 0) {
    return null;
  }
  return {
    usingTitle: rows[0]?.usingTitle ? String(rows[0].usingTitle) : null,
    titleCount: total,
    coins:
      coinRows[0]?.amount === null || coinRows[0]?.amount === undefined
        ? null
        : Number(coinRows[0].amount),
  };
}

async function resolveTitlePlayerName(uuid: string): Promise<string> {
  const rows = await query<RowDataPacket[]>(
    `SELECT player_name AS name FROM title_player
      WHERE player_uuid = ? AND player_name IS NOT NULL
      LIMIT 1`,
    [uuid],
  );
  return rows[0]?.name ? String(rows[0].name) : uuid.slice(0, 8);
}
