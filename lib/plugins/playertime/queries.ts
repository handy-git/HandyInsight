import { addDays, format, startOfDay, startOfWeek } from "date-fns";
import type { RowDataPacket } from "mysql2/promise";

import { formatDateTime, num } from "@/lib/common/format";
import type { SortOrder } from "@/lib/common/sort";
import { createCache } from "@/lib/server/cache";
import { query } from "@/lib/server/mysql";
import type {
  OnlinePlayer,
  Paginated,
  PlayerDetail,
  PlayerListItem,
  PlayerTimeSortField,
  PlayertimeOverview,
  RankingEntry,
  RankingScope,
  SessionItem,
  TrendPoint,
  TrendRange,
} from "@/lib/plugins/playertime/types";

const DATE_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss";

/** SQL 参数用的日期字符串。 */
function toSqlDateTime(date: Date): string {
  return format(date, DATE_TIME_FORMAT);
}
const PAGE_SIZE = 20;

/** 当前周期键，与 player_time 表中的周期字段对应。 */
function currentPeriodKeys(now = new Date()) {
  return {
    today: format(now, "yyyy-MM-dd"),
    weekStart: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    month: format(now, "yyyy-MM"),
  };
}

function rangeStart(range: TrendRange, now = new Date()): Date {
  const days = range === "7d" ? 6 : 29;
  return startOfDay(addDays(now, -days));
}

/* ---------- 总览与排行：30 秒进程内缓存（共享实现，命名空间隔离） ---------- */

const cached = createCache("playertime");

/* ---------- 总览 ---------- */

export async function getOverview(): Promise<PlayertimeOverview> {
  return cached("overview", async () => {
    const now = new Date();
    const dayStart = toSqlDateTime(startOfDay(now));
    const nowText = toSqlDateTime(now);

    // 三条互不依赖的聚合并行执行，避免串行等待三次 RTT
    const [onlineRows, todayRows, avgRows] = await Promise.all([
      query<RowDataPacket[]>(
        `SELECT COUNT(DISTINCT player_uuid) AS onlinePlayers
           FROM player_time_record
          WHERE quit_time IS NULL`,
      ),
      query<RowDataPacket[]>(
        `SELECT COUNT(DISTINCT player_uuid) AS todayActivePlayers,
                COALESCE(SUM(TIMESTAMPDIFF(SECOND,
                  GREATEST(login_time, ?),
                  LEAST(COALESCE(quit_time, NOW()), ?))), 0) AS todaySeconds
           FROM player_time_record
          WHERE login_time < ? AND (quit_time IS NULL OR quit_time > ?)`,
        [dayStart, nowText, nowText, dayStart],
      ),
      query<RowDataPacket[]>(
        `SELECT COALESCE(AVG(TIMESTAMPDIFF(SECOND, login_time, quit_time)), 0) AS averageSessionSeconds
           FROM player_time_record
          WHERE quit_time IS NOT NULL
            AND quit_time > ? AND quit_time <= ?`,
        [dayStart, nowText],
      ),
    ]);

    return {
      onlinePlayers: num(onlineRows[0]?.onlinePlayers),
      todayActivePlayers: num(todayRows[0]?.todayActivePlayers),
      todaySeconds: num(todayRows[0]?.todaySeconds),
      averageSessionSeconds: Math.round(
        num(avgRows[0]?.averageSessionSeconds),
      ),
    };
  });
}

/* ---------- 趋势 ---------- */

interface SessionRow extends RowDataPacket {
  playerUuid: string;
  loginTime: string;
  quitTime: string | null;
}

/** 拉取与时间范围存在交集的会话（范围有上界，禁止无边界扫描）。 */
async function querySessionsBetween(
  start: Date,
  end: Date,
  uuid?: string,
): Promise<SessionRow[]> {
  const conditions = ["login_time < ?", "(quit_time IS NULL OR quit_time > ?)"];
  const params: unknown[] = [toSqlDateTime(end), toSqlDateTime(start)];
  if (uuid) {
    conditions.push("player_uuid = ?");
    params.push(uuid);
  }
  return query<SessionRow[]>(
    `SELECT player_uuid AS playerUuid, login_time AS loginTime, quit_time AS quitTime
       FROM player_time_record
      WHERE ${conditions.join(" AND ")}`,
    params,
  );
}

/**
 * 按日期边界拆分会话（跨零点会话拆到对应日期），
 * 统计每日在线秒数与活跃玩家数。
 */
export async function getTrend(
  range: TrendRange,
  uuid?: string,
): Promise<TrendPoint[]> {
  const now = new Date();
  const start = rangeStart(range, now);
  const days =
    range === "7d"
      ? Array.from({ length: 7 }, (_, index) => addDays(start, index))
      : Array.from({ length: 30 }, (_, index) => addDays(start, index));

  const rows = await querySessionsBetween(start, now, uuid);

  const points = new Map<string, { seconds: number; players: Set<string> }>(
    days.map((day) => [
      format(day, "yyyy-MM-dd"),
      { seconds: 0, players: new Set<string>() },
    ]),
  );

  for (const row of rows) {
    const login = new Date(row.loginTime.replace(" ", "T"));
    const quit = row.quitTime ? new Date(row.quitTime.replace(" ", "T")) : now;
    for (const day of days) {
      const dayStart = startOfDay(day);
      const dayEnd = addDays(dayStart, 1);
      const effectiveStart = login > dayStart ? login : dayStart;
      const effectiveEnd = quit < dayEnd ? quit : dayEnd;
      const seconds = Math.max(
        0,
        Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / 1000),
      );
      if (seconds > 0) {
        const point = points.get(format(day, "yyyy-MM-dd"));
        if (point) {
          point.seconds += seconds;
          point.players.add(row.playerUuid);
        }
      }
    }
  }

  return Array.from(points.entries()).map(([date, point]) => ({
    date,
    seconds: point.seconds,
    players: point.players.size,
  }));
}

/* ---------- 当前在线玩家 ---------- */

export async function getOnlinePlayers(): Promise<OnlinePlayer[]> {
  const rows = await query<RowDataPacket[]>(
    `SELECT player_uuid AS uuid,
            MAX(player_name) AS name,
            MIN(login_time) AS loginTime,
            TIMESTAMPDIFF(SECOND, MIN(login_time), NOW()) AS sessionSeconds
       FROM player_time_record
      WHERE quit_time IS NULL
      GROUP BY player_uuid
      ORDER BY loginTime ASC`,
  );
  return rows.map((row) => ({
    uuid: String(row.uuid),
    name: String(row.name),
    loginTime: formatDateTime(String(row.loginTime)),
    sessionSeconds: Number(row.sessionSeconds),
  }));
}

/* ---------- 排行 ---------- */

/** 周期字段校验表达式：周期键不属于当前周期时按 0 计。 */
function periodValueExpression(scope: RankingScope): {
  expression: string;
  params: string[];
} {
  const keys = currentPeriodKeys();
  switch (scope) {
    case "today":
      return {
        expression: `CASE WHEN today_date = ? THEN today_second ELSE 0 END`,
        params: [keys.today],
      };
    case "week":
      return {
        expression: `CASE WHEN week_start = ? THEN week_second ELSE 0 END`,
        params: [keys.weekStart],
      };
    case "month":
      return {
        expression: `CASE WHEN month_key = ? THEN month_second ELSE 0 END`,
        params: [keys.month],
      };
    case "total":
      return { expression: "`second`", params: [] };
  }
}

export async function getRanking(
  scope: RankingScope,
  page: number,
): Promise<Paginated<RankingEntry>> {
  return cached(`ranking:${scope}:${page}`, async () => {
    const { expression, params } = periodValueExpression(scope);
    const offset = (page - 1) * PAGE_SIZE;

    const rows = await query<RowDataPacket[]>(
      `SELECT player_uuid AS uuid, player_name AS name, ${expression} AS seconds
         FROM player_time
        ORDER BY seconds DESC, player_name ASC
        LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, offset],
    );
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM player_time`,
    );

    return {
      items: rows.map((row, index) => ({
        rank: offset + index + 1,
        uuid: String(row.uuid),
        name: String(row.name),
        seconds: Number(row.seconds),
      })),
      total: num(countRows[0]?.total),
      page,
      pageSize: PAGE_SIZE,
    };
  });
}

/* ---------- 玩家列表 ---------- */

/** 列表排序字段 → SQL ORDER BY 表达式（白名单，安全拼接方向后缀）。 */
const SORT_EXPR: Record<PlayerTimeSortField, string> = {
  name: "pt.player_name",
  // today/week/month 是 SELECT 里的 CASE 表达式，ORDER BY 引用别名即可
  today: "todaySeconds",
  week: "weekSeconds",
  month: "monthSeconds",
  total: "totalSeconds",
};

export async function getPlayers(
  keyword: string,
  page: number,
  sort: PlayerTimeSortField = "total",
  order: SortOrder = "desc",
): Promise<Paginated<PlayerListItem>> {
  const keys = currentPeriodKeys();
  const like = `%${keyword}%`;
  const offset = (page - 1) * PAGE_SIZE;

  const where = keyword ? "WHERE pt.player_name LIKE ?" : "";
  const baseParams = keyword ? [like] : [];

  const rows = await query<RowDataPacket[]>(
    `SELECT pt.player_uuid AS uuid,
            pt.player_name AS name,
            CASE WHEN pt.today_date = ? THEN pt.today_second ELSE 0 END AS todaySeconds,
            CASE WHEN pt.week_start = ? THEN pt.week_second ELSE 0 END AS weekSeconds,
            CASE WHEN pt.month_key = ? THEN pt.month_second ELSE 0 END AS monthSeconds,
            pt.\`second\` AS totalSeconds,
            EXISTS(
              SELECT 1 FROM player_time_record ptr
               WHERE ptr.player_uuid = pt.player_uuid AND ptr.quit_time IS NULL
            ) AS online
       FROM player_time pt
       ${where}
      ORDER BY ${SORT_EXPR[sort]} ${order.toUpperCase()}, pt.player_name ASC
      LIMIT ? OFFSET ?`,
    [keys.today, keys.weekStart, keys.month, ...baseParams, PAGE_SIZE, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM player_time pt ${where}`,
    baseParams,
  );

  return {
    items: rows.map((row) => ({
      uuid: String(row.uuid),
      name: String(row.name),
      online: Boolean(Number(row.online)),
      todaySeconds: Number(row.todaySeconds),
      weekSeconds: Number(row.weekSeconds),
      monthSeconds: Number(row.monthSeconds),
      totalSeconds: Number(row.totalSeconds),
    })),
    total: num(countRows[0]?.total),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 玩家详情 ---------- */

export async function getPlayerDetail(
  uuid: string,
): Promise<PlayerDetail | null> {
  const keys = currentPeriodKeys();
  const rows = await query<RowDataPacket[]>(
    `SELECT pt.player_uuid AS uuid,
            pt.player_name AS name,
            CASE WHEN pt.today_date = ? THEN pt.today_second ELSE 0 END AS todaySeconds,
            CASE WHEN pt.week_start = ? THEN pt.week_second ELSE 0 END AS weekSeconds,
            CASE WHEN pt.month_key = ? THEN pt.month_second ELSE 0 END AS monthSeconds,
            pt.\`second\` AS totalSeconds,
            (SELECT MIN(ptr.login_time) FROM player_time_record ptr
              WHERE ptr.player_uuid = pt.player_uuid AND ptr.quit_time IS NULL) AS loginTime
       FROM player_time pt
      WHERE pt.player_uuid = ?
      LIMIT 1`,
    [keys.today, keys.weekStart, keys.month, uuid],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    uuid: String(row.uuid),
    name: String(row.name),
    online: row.loginTime !== null && row.loginTime !== undefined,
    loginTime: row.loginTime ? formatDateTime(String(row.loginTime)) : null,
    todaySeconds: Number(row.todaySeconds),
    weekSeconds: Number(row.weekSeconds),
    monthSeconds: Number(row.monthSeconds),
    totalSeconds: Number(row.totalSeconds),
  };
}

/* ---------- 玩家会话分页 ---------- */

export async function getPlayerSessions(
  uuid: string,
  page: number,
  pageSize: number = PAGE_SIZE,
): Promise<Paginated<SessionItem>> {
  const offset = (page - 1) * pageSize;
  const rows = await query<RowDataPacket[]>(
    `SELECT login_time AS loginTime,
            quit_time AS quitTime,
            TIMESTAMPDIFF(SECOND, login_time, COALESCE(quit_time, NOW())) AS seconds
       FROM player_time_record
      WHERE player_uuid = ?
      ORDER BY login_time DESC
      LIMIT ? OFFSET ?`,
    [uuid, pageSize, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM player_time_record WHERE player_uuid = ?`,
    [uuid],
  );
  return {
    items: rows.map((row) => ({
      loginTime: formatDateTime(String(row.loginTime)),
      quitTime: row.quitTime ? formatDateTime(String(row.quitTime)) : null,
      seconds: Number(row.seconds),
    })),
    total: num(countRows[0]?.total),
    page,
    pageSize,
  };
}

export { PAGE_SIZE };
