import { addDays, format } from "date-fns";
import type { RowDataPacket } from "mysql2/promise";

import { formatDateTime, num } from "@/lib/common/format";
import type { SortOrder } from "@/lib/common/sort";
import type { Paginated } from "@/lib/common/types";
import {
  groupNameSchema,
  luckPermsGroupMemberQuerySchema,
  luckPermsGroupsQuerySchema,
  luckPermsLogsQuerySchema,
  luckPermsPlayersQuerySchema,
} from "@/lib/plugins/luckperms/schemas";
import type {
  LuckPermsActionEntry,
  LuckPermsGroupDetail,
  LuckPermsGroupItem,
  LuckPermsGroupMember,
  LuckPermsGroupSortField,
  LuckPermsLogPage,
  LuckPermsLogStats,
  LuckPermsOverview,
  LuckPermsPermissionEntry,
  LuckPermsPlayerItem,
  LuckPermsPlayerSortField,
  LuckPermsPlayerSummary,
} from "@/lib/plugins/luckperms/types";
import { createCache } from "@/lib/server/cache";
import { escapeIdent, query } from "@/lib/server/mysql";

const PAGE_SIZE = 20;

export {
  groupNameSchema,
  luckPermsGroupMemberQuerySchema,
  luckPermsGroupsQuerySchema,
  luckPermsLogsQuerySchema,
  luckPermsPlayersQuerySchema,
};

/* ---------- 工具：可选表探测（30 秒缓存，缺表则区块降级） ---------- */

const tableCache = new Map<string, { exists: boolean; expiresAt: number }>();

async function tableExists(table: string): Promise<boolean> {
  const hit = tableCache.get(table);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.exists;
  }
  let exists = false;
  try {
    await query<RowDataPacket[]>(`SELECT 1 FROM ${escapeIdent(table)} LIMIT 1`);
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

/* ---------- 工具：LuckPerms 时间字段（毫秒 bigint） ---------- */

/** luckperms_actions.time / 各权限表 expiry 为毫秒 bigint，兼容秒级取值。 */
function fromUnixMillis(expr: string): string {
  return `FROM_UNIXTIME(CASE WHEN ${expr} > 1000000000000 THEN ${expr} / 1000 ELSE ${expr} END)`;
}

/** 权限过期时间：0 / NULL 视为永久，返回 null；否则格式化为 yyyy-MM-dd HH:mm:ss。 */
function expiryLabel(value: unknown): string | null {
  const millis = num(value);
  if (millis <= 0) return null;
  const seconds = millis > 1000000000000 ? Math.floor(millis / 1000) : millis;
  return format(new Date(seconds * 1000), "yyyy-MM-dd HH:mm:ss");
}

/** actions.type 为单字符（u 玩家 / g 权限组 / t 轨道），未知兜底显示原文。 */
const ACTION_TYPE_LABELS: Record<string, string> = {
  u: "玩家",
  g: "权限组",
  t: "轨道",
};

function actionTypeLabel(type: string | null): string {
  if (!type) return "未知";
  return ACTION_TYPE_LABELS[type] ?? type;
}

function toPermissionEntry(row: RowDataPacket): LuckPermsPermissionEntry {
  return {
    permission: String(row.permission),
    value: num(row.value) === 1,
    server: row.server ? String(row.server) : null,
    world: row.world ? String(row.world) : null,
    expiry: expiryLabel(row.expiry),
    contexts: row.contexts ? String(row.contexts) : null,
  };
}

function toActionEntry(row: RowDataPacket): LuckPermsActionEntry {
  return {
    id: num(row.id),
    time: row.time ? formatDateTime(String(row.time)) : "",
    actorName: row.actorName ? String(row.actorName) : null,
    type: actionTypeLabel(row.type ? String(row.type) : null),
    actedName: row.actedName ? String(row.actedName) : null,
    action: row.action ? String(row.action) : "",
  };
}

/* ---------- 总览：30 秒进程内缓存（共享实现，命名空间隔离） ---------- */

const cached = createCache("luckperms");

export async function getLuckPermsOverview(): Promise<LuckPermsOverview> {
  return cached("overview", async () => {
    const [
      playerRows,
      groupRows,
      permRows,
      directRows,
      actionRows,
      distRows,
      topRows,
      recentRows,
    ] = await Promise.all([
      query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM luckperms_players`,
      ),
      query<RowDataPacket[]>(
        `SELECT COUNT(DISTINCT primary_group) AS total FROM luckperms_players`,
      ),
      query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM luckperms_group_permissions`,
      ),
      queryIfExists<RowDataPacket[]>(
        "luckperms_user_permissions",
        `SELECT COUNT(DISTINCT uuid) AS total FROM luckperms_user_permissions`,
      ),
      queryIfExists<RowDataPacket[]>(
        "luckperms_actions",
        `SELECT COUNT(*) AS total FROM luckperms_actions`,
      ),
      query<RowDataPacket[]>(
        `SELECT primary_group AS name, COUNT(*) AS memberCount
           FROM luckperms_players
          GROUP BY primary_group
          ORDER BY memberCount DESC, name ASC
          LIMIT 10`,
      ),
      query<RowDataPacket[]>(
        `SELECT name, COUNT(*) AS count
           FROM luckperms_group_permissions
          GROUP BY name
          ORDER BY count DESC, name ASC
          LIMIT 10`,
      ),
      queryIfExists<RowDataPacket[]>(
        "luckperms_actions",
        `SELECT id, ${fromUnixMillis("time")} AS time,
                actor_name AS actorName, type, acted_name AS actedName, action
           FROM luckperms_actions
          ORDER BY time DESC, id DESC
          LIMIT 10`,
      ),
    ]);

    // 可选表存在性（命中 30 秒缓存，区分「缺表」与「有表但空」）
    const [hasUserPerms, hasActions] = await Promise.all([
      tableExists("luckperms_user_permissions"),
      tableExists("luckperms_actions"),
    ]);

    return {
      totalPlayers: num(playerRows[0]?.total),
      totalGroups: num(groupRows[0]?.total),
      totalGroupPermissions: num(permRows[0]?.total),
      totalDirectPlayers: hasUserPerms ? num(directRows[0]?.total) : null,
      totalActions: hasActions ? num(actionRows[0]?.total) : null,
      groupDistribution: distRows.map((row) => ({
        name: String(row.name),
        memberCount: num(row.memberCount),
      })),
      topPermissionGroups: topRows.map((row) => ({
        name: String(row.name),
        count: num(row.count),
      })),
      recentActions: hasActions ? recentRows.map(toActionEntry) : null,
    };
  });
}

/* ---------- 权限组列表（搜索 + 服务端分页 + 动态排序） ---------- */

/** ORDER BY 白名单映射：全部是 SELECT 里的别名。 */
const GROUP_SORT_EXPR: Record<LuckPermsGroupSortField, string> = {
  name: "name",
  members: "memberCount",
  permissions: "permissionCount",
};

export async function getLuckPermsGroupList(input: {
  keyword: string;
  page: number;
  sort: LuckPermsGroupSortField;
  order: SortOrder;
}): Promise<Paginated<LuckPermsGroupItem>> {
  const { keyword, page, sort = "members", order = "desc" } = input;
  const listWhere = keyword ? "WHERE lp.primary_group LIKE ?" : "";
  const countWhere = keyword ? "WHERE primary_group LIKE ?" : "";
  const params = keyword ? [`%${keyword}%`] : [];
  const offset = (page - 1) * PAGE_SIZE;

  const rows = await query<RowDataPacket[]>(
    `SELECT lp.primary_group AS name, COUNT(*) AS memberCount,
            (SELECT COUNT(*) FROM luckperms_group_permissions lgp
              WHERE lgp.name = lp.primary_group) AS permissionCount
       FROM luckperms_players lp
       ${listWhere}
      GROUP BY lp.primary_group
      ORDER BY ${GROUP_SORT_EXPR[sort]} ${order.toUpperCase()}, name ASC
      LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT primary_group) AS total FROM luckperms_players ${countWhere}`,
    params,
  );

  return {
    items: rows.map(
      (row): LuckPermsGroupItem => ({
        name: String(row.name),
        memberCount: num(row.memberCount),
        permissionCount: num(row.permissionCount),
      }),
    ),
    total: num(countRows[0]?.total),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 权限组详情（权限列表；成员走独立分页接口） ---------- */

export async function getLuckPermsGroupDetail(
  name: string,
): Promise<LuckPermsGroupDetail | null> {
  const [mainRows, permRows] = await Promise.all([
    query<RowDataPacket[]>(
      `SELECT primary_group AS name, COUNT(*) AS memberCount
         FROM luckperms_players
        WHERE primary_group = ?
        GROUP BY primary_group`,
      [name],
    ),
    query<RowDataPacket[]>(
      `SELECT permission, value, server, world, expiry, contexts
         FROM luckperms_group_permissions
        WHERE name = ?
        ORDER BY permission ASC
        LIMIT 300`,
      [name],
    ),
  ]);

  const main = mainRows[0];
  // 组可能只配置了权限但没有玩家分配，此时仅权限列表非空也视为有效
  if (!main && permRows.length === 0) {
    return null;
  }
  return {
    name,
    memberCount: main ? num(main.memberCount) : 0,
    permissionCount: permRows.length,
    permissions: permRows.map(toPermissionEntry),
  };
}

export async function getLuckPermsGroupMembers(
  name: string,
  keyword: string,
  page: number,
): Promise<Paginated<LuckPermsGroupMember>> {
  const where = keyword
    ? "WHERE primary_group = ? AND username LIKE ?"
    : "WHERE primary_group = ?";
  const params = keyword ? [name, `%${keyword}%`] : [name];
  const offset = (page - 1) * PAGE_SIZE;

  const rows = await query<RowDataPacket[]>(
    `SELECT uuid, username
       FROM luckperms_players
       ${where}
      ORDER BY username ASC
      LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM luckperms_players ${where}`,
    params,
  );

  return {
    items: rows.map(
      (row): LuckPermsGroupMember => ({
        uuid: String(row.uuid),
        username: String(row.username),
      }),
    ),
    total: num(countRows[0]?.total),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 玩家权限列表（搜索 + 服务端分页 + 动态排序） ---------- */

/** ORDER BY 白名单映射。 */
const PLAYER_SORT_EXPR: Record<LuckPermsPlayerSortField, string> = {
  username: "username",
  primaryGroup: "primary_group",
  directPermissions: "directPermissions",
};

export async function getLuckPermsPlayers(input: {
  keyword: string;
  page: number;
  sort: LuckPermsPlayerSortField;
  order: SortOrder;
}): Promise<Paginated<LuckPermsPlayerItem>> {
  const { keyword, page, sort = "primaryGroup", order = "asc" } = input;
  const hasUserPerms = await tableExists("luckperms_user_permissions");
  const where = keyword ? "WHERE username LIKE ?" : "";
  const params = keyword ? [`%${keyword}%`] : [];
  const offset = (page - 1) * PAGE_SIZE;

  // 直接权限数来自可选表：缺表时整列置空，且不允许按该列排序
  const directSelect = hasUserPerms
    ? `(SELECT COUNT(*) FROM luckperms_user_permissions lup
        WHERE lup.uuid = lp.uuid) AS directPermissions`
    : `NULL AS directPermissions`;
  const sortExpr =
    !hasUserPerms && sort === "directPermissions"
      ? "username"
      : PLAYER_SORT_EXPR[sort];

  const rows = await query<RowDataPacket[]>(
    `SELECT lp.uuid, lp.username, lp.primary_group AS primaryGroup,
            ${directSelect}
       FROM luckperms_players lp
       ${where}
      ORDER BY ${sortExpr} ${order.toUpperCase()}, username ASC
      LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM luckperms_players ${where}`,
    params,
  );

  return {
    items: rows.map(
      (row): LuckPermsPlayerItem => ({
        uuid: String(row.uuid),
        username: String(row.username),
        primaryGroup: row.primaryGroup ? String(row.primaryGroup) : "default",
        directPermissionCount: hasUserPerms ? num(row.directPermissions) : null,
      }),
    ),
    total: num(countRows[0]?.total),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 操作日志（可选表：页面整体依赖 luckperms_actions） ---------- */

export async function getLuckPermsLogStats(): Promise<LuckPermsLogStats> {
  // 30 天窗口起点（含今天共 30 天），actions.time 为毫秒
  const sinceMillis = Date.now() - 29 * 86_400_000;
  const [typeRows, trendRows, countRows] = await Promise.all([
    query<RowDataPacket[]>(
      `SELECT type, COUNT(*) AS count
         FROM luckperms_actions
        GROUP BY type
        ORDER BY count DESC, type ASC
        LIMIT 20`,
    ),
    query<RowDataPacket[]>(
      `SELECT DATE_FORMAT(${fromUnixMillis("time")}, '%Y-%m-%d') AS date,
              COUNT(*) AS count
         FROM luckperms_actions
        WHERE time >= ?
        GROUP BY DATE_FORMAT(${fromUnixMillis("time")}, '%Y-%m-%d')`,
      [sinceMillis],
    ),
    query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM luckperms_actions`),
  ]);

  const trendMap = new Map(
    trendRows.map((row) => [String(row.date), num(row.count)]),
  );
  // 趋势按天补零，保证 30 天连续序列
  const trend = Array.from({ length: 30 }, (_, index) => {
    const date = format(addDays(new Date(), index - 29), "yyyy-MM-dd");
    return { date, count: trendMap.get(date) ?? 0 };
  });

  return {
    total: num(countRows[0]?.total),
    typeDistribution: typeRows.map((row) => ({
      type: actionTypeLabel(row.type ? String(row.type) : null),
      count: num(row.count),
    })),
    trend,
  };
}

export async function getLuckPermsLogs(input: {
  keyword: string;
  page: number;
}): Promise<Paginated<LuckPermsActionEntry>> {
  const { keyword, page } = input;
  const where = keyword
    ? "WHERE actor_name LIKE ? OR acted_name LIKE ?"
    : "";
  const params = keyword ? [`%${keyword}%`, `%${keyword}%`] : [];
  const offset = (page - 1) * PAGE_SIZE;

  const rows = await query<RowDataPacket[]>(
    `SELECT id, ${fromUnixMillis("time")} AS time,
            actor_name AS actorName, type, acted_name AS actedName, action
       FROM luckperms_actions
       ${where}
      ORDER BY time DESC, id DESC
      LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM luckperms_actions ${where}`,
    params,
  );

  return {
    items: rows.map(toActionEntry),
    total: num(countRows[0]?.total),
    page,
    pageSize: PAGE_SIZE,
  };
}

/** 日志页：统计 + 分页列表一次返回（统计 30 秒缓存，翻页不重复计算）。 */
export async function getLuckPermsLogPage(input: {
  keyword: string;
  page: number;
}): Promise<LuckPermsLogPage> {
  const [stats, list] = await Promise.all([
    cached("logStats", getLuckPermsLogStats),
    getLuckPermsLogs(input),
  ]);
  return { stats, ...list };
}

/* ---------- 全服玩家详情用的轻量摘要 ---------- */

export async function getLuckPermsPlayerSummary(
  uuid: string,
): Promise<LuckPermsPlayerSummary | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT primary_group AS primaryGroup
       FROM luckperms_players
      WHERE uuid = ?
      LIMIT 1`,
    [uuid],
  );
  const row = rows[0];
  if (!row) {
    return null;
  }
  const hasUserPerms = await tableExists("luckperms_user_permissions");
  const directRows = hasUserPerms
    ? await query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total
           FROM luckperms_user_permissions
          WHERE uuid = ?`,
        [uuid],
      )
    : [];
  return {
    primaryGroup: row.primaryGroup ? String(row.primaryGroup) : "default",
    directPermissionCount: hasUserPerms ? num(directRows[0]?.total) : null,
  };
}
