import { addDays, format, startOfDay, startOfMonth } from "date-fns";
import type { RowDataPacket } from "mysql2/promise";

import { formatDateTime } from "@/lib/common/format";
import { query } from "@/lib/server/mysql";
import type { Paginated } from "@/lib/common/types";
import type {
  SignInOverview,
  SignInPlayerDetail,
  SignInPlayerItem,
  SignInRankingEntry,
  SignInRecord,
  SignInTrendPoint,
  TodaySignIn,
} from "@/lib/plugins/playersignin/types";

const DATE_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss";

/** SQL 参数用的日期字符串。 */
function toSqlDateTime(date: Date): string {
  return format(date, DATE_TIME_FORMAT);
}
const PAGE_SIZE = 20;

/* ---------- 总览与排行：30 秒进程内缓存 ---------- */

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

/* ---------- 总览 ---------- */

export async function getSignInOverview(): Promise<SignInOverview> {
  return cached("overview", async () => {
    const dayStart = toSqlDateTime(startOfDay(new Date()));
    const rows = await query<RowDataPacket[]>(
      `SELECT
         (SELECT COUNT(*) FROM player_sign_in WHERE sign_in_date >= ?) AS todaySigns,
         (SELECT COUNT(*) FROM player_sign_in) AS totalSigns,
         (SELECT COUNT(DISTINCT player_uuid) FROM player_sign_in) AS totalPlayers,
         (SELECT COALESCE(SUM(amount), 0) FROM player_sign_card) AS totalCards`,
      [dayStart],
    );
    const row = rows[0] ?? {};
    return {
      todaySigns: Number(row.todaySigns ?? 0),
      totalSigns: Number(row.totalSigns ?? 0),
      totalPlayers: Number(row.totalPlayers ?? 0),
      totalCards: Number(row.totalCards ?? 0),
    };
  });
}

/* ---------- 趋势 ---------- */

export async function getSignInTrend(
  range: "7d" | "30d",
): Promise<SignInTrendPoint[]> {
  const now = new Date();
  const days = range === "7d" ? 6 : 29;
  const start = startOfDay(addDays(now, -days));

  // 范围有上界（最多 30 天），禁止无边界扫描
  const rows = await query<RowDataPacket[]>(
    `SELECT DATE(sign_in_date) AS date, COUNT(*) AS signs
       FROM player_sign_in
      WHERE sign_in_date >= ?
      GROUP BY DATE(sign_in_date)`,
    [toSqlDateTime(start)],
  );
  const byDate = new Map(
    rows.map((row) => [String(row.date), Number(row.signs)]),
  );

  return Array.from({ length: days + 1 }, (_, index) => {
    const date = format(addDays(start, index), "yyyy-MM-dd");
    return { date, signs: byDate.get(date) ?? 0 };
  });
}

/* ---------- 今日签到名单 ---------- */

export async function getTodaySignIns(): Promise<TodaySignIn[]> {
  const dayStart = toSqlDateTime(startOfDay(new Date()));
  const rows = await query<RowDataPacket[]>(
    `SELECT player_uuid AS uuid,
            player_name AS name,
            sign_in_date AS signInDate,
            \`rank\` AS signRank
       FROM player_sign_in
      WHERE sign_in_date >= ?
      ORDER BY sign_in_date ASC
      LIMIT 200`,
    [dayStart],
  );
  return rows.map((row) => ({
    uuid: String(row.uuid),
    name: String(row.name),
    time: formatDateTime(String(row.signInDate)).slice(11),
    rank: Number(row.signRank),
  }));
}

/* ---------- 累计签到排行 ---------- */

export async function getSignInRanking(): Promise<SignInRankingEntry[]> {
  return cached("ranking", async () => {
    const rows = await query<RowDataPacket[]>(
      `SELECT player_uuid AS uuid,
              MAX(player_name) AS name,
              COUNT(*) AS signs
         FROM player_sign_in
        GROUP BY player_uuid
        ORDER BY signs DESC, MAX(sign_in_date) ASC
        LIMIT 20`,
    );
    return rows.map((row, index) => ({
      rank: index + 1,
      uuid: String(row.uuid),
      name: String(row.name),
      signs: Number(row.signs),
    }));
  });
}

/* ---------- 签到玩家列表（搜索 + 服务端分页） ---------- */

export async function getSignInPlayers(
  keyword: string,
  page: number,
): Promise<Paginated<SignInPlayerItem>> {
  const monthStart = toSqlDateTime(startOfMonth(new Date()));
  const like = `%${keyword}%`;
  const offset = (page - 1) * PAGE_SIZE;
  const where = keyword ? "WHERE s.player_name LIKE ?" : "";
  const baseParams = keyword ? [like] : [];

  const rows = await query<RowDataPacket[]>(
    `SELECT s.player_uuid AS uuid,
            MAX(s.player_name) AS name,
            COUNT(*) AS totalSigns,
            COALESCE(SUM(s.sign_in_date >= ?), 0) AS monthSigns,
            MAX(s.sign_in_date) AS lastSignAt,
            COALESCE(c.cards, 0) AS cards
       FROM player_sign_in s
       LEFT JOIN (
         SELECT player_uuid, SUM(amount) AS cards
           FROM player_sign_card
          GROUP BY player_uuid
       ) c ON c.player_uuid = s.player_uuid
       ${where}
      GROUP BY s.player_uuid
      ORDER BY totalSigns DESC, lastSignAt ASC
      LIMIT ? OFFSET ?`,
    [monthStart, ...baseParams, PAGE_SIZE, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT s.player_uuid) AS total FROM player_sign_in s ${where}`,
    baseParams,
  );

  return {
    items: rows.map((row) => ({
      uuid: String(row.uuid),
      name: String(row.name),
      totalSigns: Number(row.totalSigns),
      monthSigns: Number(row.monthSigns),
      lastSignAt: row.lastSignAt ? formatDateTime(String(row.lastSignAt)) : null,
      cards: Number(row.cards),
    })),
    total: Number(countRows[0]?.total ?? 0),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 玩家签到详情 ---------- */

export async function getSignInPlayerDetail(
  uuid: string,
): Promise<SignInPlayerDetail | null> {
  const now = new Date();
  const monthStart = toSqlDateTime(startOfMonth(now));

  const rows = await query<RowDataPacket[]>(
    `SELECT player_uuid AS uuid,
            MAX(player_name) AS name,
            COUNT(*) AS totalSigns,
            COALESCE(SUM(sign_in_date >= ?), 0) AS monthSigns,
            MAX(sign_in_date) AS lastSignAt
       FROM player_sign_in
      WHERE player_uuid = ?
      GROUP BY player_uuid`,
    [monthStart, uuid],
  );
  const row = rows[0];
  if (!row) return null;

  const [cardRows, dateRows] = await Promise.all([
    query<RowDataPacket[]>(
      `SELECT card_type AS cardType, card_month AS cardMonth, amount
         FROM player_sign_card
        WHERE player_uuid = ?
        ORDER BY card_type ASC`,
      [uuid],
    ),
    // 最近一年的去重签到日期，用于计算连续签到天数与本月日历
    query<RowDataPacket[]>(
      `SELECT DISTINCT DATE(sign_in_date) AS signDate
         FROM player_sign_in
        WHERE player_uuid = ?
        ORDER BY signDate DESC
        LIMIT 400`,
      [uuid],
    ),
  ]);

  const signDates = dateRows.map((dateRow) => String(dateRow.signDate));
  const monthPrefix = format(now, "yyyy-MM");
  const monthDays = signDates
    .filter((date) => date.startsWith(monthPrefix))
    .map((date) => Number(date.slice(8, 10)));

  // 连续签到：从今日（或昨日）起逐日向前累计，遇到断档即止
  let streak = 0;
  let cursor = startOfDay(now);
  const dateSet = new Set(signDates);
  if (!dateSet.has(format(cursor, "yyyy-MM-dd"))) {
    cursor = addDays(cursor, -1);
  }
  while (dateSet.has(format(cursor, "yyyy-MM-dd"))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return {
    uuid: String(row.uuid),
    name: String(row.name),
    totalSigns: Number(row.totalSigns),
    monthSigns: Number(row.monthSigns),
    streak,
    lastSignAt: row.lastSignAt ? formatDateTime(String(row.lastSignAt)) : null,
    cards: cardRows.map((card) => ({
      cardType: String(card.cardType),
      cardMonth: card.cardMonth ? String(card.cardMonth) : null,
      amount: Number(card.amount),
    })),
    monthDays,
  };
}

/** 玩家最近 N 条签到记录（单条 SQL，供时间线使用）。 */
export async function getRecentSignInRecords(
  uuid: string,
  limit = 50,
): Promise<SignInRecord[]> {
  const rows = await query<RowDataPacket[]>(
    `SELECT sign_in_date AS signInDate, \`rank\` AS signRank
       FROM player_sign_in
      WHERE player_uuid = ?
      ORDER BY sign_in_date DESC
      LIMIT ?`,
    [uuid, limit],
  );
  return rows.map((row) => ({
    signInDate: formatDateTime(String(row.signInDate)),
    rank: Number(row.signRank),
  }));
}

/* ---------- 玩家签到记录（分页） ---------- */

export async function getSignInRecords(
  uuid: string,
  page: number,
  pageSize: number = PAGE_SIZE,
): Promise<Paginated<SignInRecord>> {
  const offset = (page - 1) * pageSize;
  const rows = await query<RowDataPacket[]>(
    `SELECT sign_in_date AS signInDate, \`rank\` AS signRank
       FROM player_sign_in
      WHERE player_uuid = ?
      ORDER BY sign_in_date DESC
      LIMIT ? OFFSET ?`,
    [uuid, pageSize, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM player_sign_in WHERE player_uuid = ?`,
    [uuid],
  );
  return {
    items: rows.map((row) => ({
      signInDate: formatDateTime(String(row.signInDate)),
      rank: Number(row.signRank),
    })),
    total: Number(countRows[0]?.total ?? 0),
    page,
    pageSize,
  };
}
