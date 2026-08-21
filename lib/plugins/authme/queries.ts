import { addDays, format, startOfDay } from "date-fns";
import type { RowDataPacket } from "mysql2/promise";

import { query } from "@/lib/server/mysql";
import type { Paginated } from "@/lib/common/types";
import type {
  AuthmeAccountDetail,
  AuthmeAccountItem,
  AuthmeOverview,
  AuthmeRecentLogin,
  AuthmeRecentRegistration,
  AuthmeTrendPoint,
} from "@/lib/plugins/authme/types";

const PAGE_SIZE = 20;

/**
 * AuthMe 的 lastlogin / regdate 是 bigint 时间戳，不同版本可能存秒或毫秒，
 * 统一用阈值 1e12 自适应归一化为秒。密码哈希与 TOTP 密钥刻意不查询，绝不下发。
 */
const LASTLOGIN_EPOCH =
  "CASE WHEN lastlogin IS NULL OR lastlogin = 0 THEN NULL ELSE CASE WHEN lastlogin > 1000000000000 THEN lastlogin / 1000 ELSE lastlogin END END";
const REGDATE_EPOCH =
  "CASE WHEN regdate IS NULL OR regdate = 0 THEN NULL ELSE CASE WHEN regdate > 1000000000000 THEN regdate / 1000 ELSE regdate END END";
const LAST_LOGIN_AT = `FROM_UNIXTIME(${LASTLOGIN_EPOCH})`;
const REG_DATE_AT = `FROM_UNIXTIME(${REGDATE_EPOCH})`;

function unixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
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

export async function getAuthmeOverview(): Promise<AuthmeOverview> {
  return cached("overview", async () => {
    const now = new Date();
    const todayStart = unixSeconds(startOfDay(now));
    const rows = await query<RowDataPacket[]>(
      `SELECT
         (SELECT COUNT(*) FROM authme) AS totalPlayers,
         (SELECT COUNT(*) FROM authme WHERE isLogged = 1) AS loggedPlayers,
         (SELECT COUNT(*) FROM authme WHERE ${REGDATE_EPOCH} >= ?) AS todayRegistered,
         (SELECT COUNT(*) FROM authme WHERE ${LASTLOGIN_EPOCH} >= ?) AS todayLoggedIn,
         (SELECT COUNT(*) FROM authme WHERE ${LASTLOGIN_EPOCH} >= ?) AS active24h,
         (SELECT COUNT(*) FROM authme WHERE ${LASTLOGIN_EPOCH} >= ?) AS active7d,
         (SELECT COUNT(*) FROM authme WHERE ${LASTLOGIN_EPOCH} >= ?) AS active30d`,
      [
        todayStart,
        todayStart,
        unixSeconds(addDays(now, -1)),
        unixSeconds(addDays(now, -7)),
        unixSeconds(addDays(now, -30)),
      ],
    );
    const row = rows[0] ?? {};
    return {
      totalPlayers: Number(row.totalPlayers ?? 0),
      loggedPlayers: Number(row.loggedPlayers ?? 0),
      todayRegistered: Number(row.todayRegistered ?? 0),
      todayLoggedIn: Number(row.todayLoggedIn ?? 0),
      active24h: Number(row.active24h ?? 0),
      active7d: Number(row.active7d ?? 0),
      active30d: Number(row.active30d ?? 0),
    };
  });
}

/* ---------- 注册趋势 ---------- */

export async function getAuthmeTrend(
  range: "7d" | "30d",
): Promise<AuthmeTrendPoint[]> {
  const now = new Date();
  const days = range === "7d" ? 6 : 29;
  const start = startOfDay(addDays(now, -days));

  const rows = await query<RowDataPacket[]>(
    `SELECT DATE(${REG_DATE_AT}) AS date, COUNT(*) AS registrations
       FROM authme
      WHERE ${REGDATE_EPOCH} >= ?
      GROUP BY DATE(${REG_DATE_AT})`,
    [unixSeconds(start)],
  );
  const byDate = new Map(
    rows.map((row) => [String(row.date), Number(row.registrations)]),
  );

  return Array.from({ length: days + 1 }, (_, index) => {
    const date = format(addDays(start, index), "yyyy-MM-dd");
    return { date, registrations: byDate.get(date) ?? 0 };
  });
}

/* ---------- 最近登录 / 最近注册 ---------- */

export async function getRecentLogins(): Promise<AuthmeRecentLogin[]> {
  const rows = await query<RowDataPacket[]>(
    `SELECT username, realname, ip, ${LAST_LOGIN_AT} AS lastLoginAt, isLogged
       FROM authme
      WHERE ${LASTLOGIN_EPOCH} IS NOT NULL
      ORDER BY lastlogin DESC
      LIMIT 20`,
  );
  return rows.map((row) => ({
    username: String(row.username),
    realname: String(row.realname),
    lastLoginAt: String(row.lastLoginAt),
    ip: row.ip ? String(row.ip) : null,
    logged: Number(row.isLogged) === 1,
  }));
}

export async function getRecentRegistrations(): Promise<
  AuthmeRecentRegistration[]
> {
  const rows = await query<RowDataPacket[]>(
    `SELECT username, realname, regip, ${REG_DATE_AT} AS regDate
       FROM authme
      WHERE ${REGDATE_EPOCH} IS NOT NULL
      ORDER BY regdate DESC
      LIMIT 20`,
  );
  return rows.map((row) => ({
    username: String(row.username),
    realname: String(row.realname),
    regDate: String(row.regDate),
    regIp: row.regip ? String(row.regip) : null,
  }));
}

/* ---------- 账户列表（搜索 + 服务端分页） ---------- */

export async function getAuthmeAccounts(
  keyword: string,
  page: number,
): Promise<Paginated<AuthmeAccountItem>> {
  const like = `%${keyword.toLowerCase()}%`;
  const displayLike = `%${keyword}%`;
  const offset = (page - 1) * PAGE_SIZE;
  const where = keyword
    ? "WHERE username LIKE ? OR realname LIKE ?"
    : "";
  const baseParams = keyword ? [like, displayLike] : [];

  const rows = await query<RowDataPacket[]>(
    `SELECT username, realname, email,
            ${REG_DATE_AT} AS regDate,
            ${LAST_LOGIN_AT} AS lastLoginAt,
            ip, world, x, y, z, isLogged
       FROM authme
       ${where}
      ORDER BY lastlogin DESC, regdate DESC
      LIMIT ? OFFSET ?`,
    [...baseParams, PAGE_SIZE, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM authme ${where}`,
    baseParams,
  );

  return {
    items: rows.map((row) => ({
      username: String(row.username),
      realname: String(row.realname),
      email: row.email ? String(row.email) : null,
      regDate: row.regDate ? String(row.regDate) : null,
      lastLoginAt: row.lastLoginAt ? String(row.lastLoginAt) : null,
      ip: row.ip ? String(row.ip) : null,
      logged: Number(row.isLogged) === 1,
      world: String(row.world),
      x: Number(row.x),
      y: Number(row.y),
      z: Number(row.z),
    })),
    total: Number(countRows[0]?.total ?? 0),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 账户详情 ---------- */

export async function getAuthmeAccountDetail(
  username: string,
): Promise<AuthmeAccountDetail | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT username, realname, email, regip, ip,
            ${REG_DATE_AT} AS regDate,
            ${LAST_LOGIN_AT} AS lastLoginAt,
            isLogged, hasSession, world, x, y, z, yaw, pitch
       FROM authme
      WHERE username = ?
      LIMIT 1`,
    [username.toLowerCase()],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    username: String(row.username),
    realname: String(row.realname),
    email: row.email ? String(row.email) : null,
    regDate: row.regDate ? String(row.regDate) : null,
    regIp: row.regip ? String(row.regip) : null,
    lastLoginAt: row.lastLoginAt ? String(row.lastLoginAt) : null,
    ip: row.ip ? String(row.ip) : null,
    logged: Number(row.isLogged) === 1,
    hasSession: Number(row.hasSession) === 1,
    world: String(row.world),
    x: Number(row.x),
    y: Number(row.y),
    z: Number(row.z),
    yaw: row.yaw === null ? null : Number(row.yaw),
    pitch: row.pitch === null ? null : Number(row.pitch),
  };
}
