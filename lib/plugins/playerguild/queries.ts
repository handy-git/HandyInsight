import { addDays, format } from "date-fns";
import type { RowDataPacket } from "mysql2/promise";

import { formatDateTime, num } from "@/lib/common/format";
import type { SortOrder } from "@/lib/common/sort";
import type { Paginated } from "@/lib/common/types";
import {
  guildIdSchema,
  guildListQuerySchema,
  guildMemberQuerySchema,
} from "@/lib/plugins/playerguild/schemas";
import type {
  GuildApplyEntry,
  GuildApplyResult,
  GuildDetail,
  GuildListItem,
  GuildMemberItem,
  GuildMemberSortField,
  GuildOverview,
  GuildPvpLogEntry,
  GuildPvpPlayerEntry,
  GuildPvpResult,
  GuildPlayerSummary,
  GuildListSortField,
  GuildShopLogEntry,
} from "@/lib/plugins/playerguild/types";
import { createCache } from "@/lib/server/cache";
import { escapeIdent, query } from "@/lib/server/mysql";

const PAGE_SIZE = 20;

export { guildIdSchema, guildListQuerySchema, guildMemberQuerySchema };

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

/* ---------- 枚举映射（插件无字典表，按常见约定映射并兜底） ---------- */

/** 角色标签：1 会长 / 2 副会 / 3 精英 / 4 成员，其余按成员展示。 */
function roleLabel(roleId: number): string {
  if (roleId === 1) return "会长";
  if (roleId === 2) return "副会";
  if (roleId === 3) return "精英";
  return "成员";
}

/** 申请审批结果：1 待审批 / 2 同意 / 3 拒绝 / 4 取消，其余按已处理展示。 */
function applyResultLabel(result: number): GuildApplyResult {
  if (result === 1) return "pending";
  if (result === 2) return "approved";
  if (result === 3) return "rejected";
  if (result === 4) return "cancelled";
  return "other";
}

/** 公会战结果：1 胜 / 0 负，其余未知。 */
function pvpResultLabel(result: number | null): GuildPvpResult {
  if (result === 1) return "win";
  if (result === 0) return "lose";
  return "unknown";
}

/** 公会战类型（guild_pvp_log.type）：season / mate / score_match / stronghold。 */
const PVP_TYPE_LABELS: Record<string, string> = {
  season: "赛季公会战",
  mate: "匹配公会战",
  score_match: "积分公会战",
  stronghold: "据点公会战",
};

function pvpTypeLabel(type: string | null): string {
  if (!type) return "—";
  return PVP_TYPE_LABELS[type] ?? type;
}

/* ---------- 总览：30 秒进程内缓存（共享实现，命名空间隔离） ---------- */

const cached = createCache("playerguild");

/** 实际成员数子查询（guild_player 聚合，guild_info.member_count 可能滞后）。 */
const MEMBER_COUNT_JOIN = `LEFT JOIN (
         SELECT guild_info_id, COUNT(*) AS memberTotal
           FROM guild_player
          GROUP BY guild_info_id
       ) mc ON mc.guild_info_id = g.id`;

const GUILD_SELECT = `SELECT g.id, g.guild_name AS name, g.description,
       g.level, g.money, g.prosperity_degree AS prosperityDegree,
       g.month_prosperity_degree AS monthProsperityDegree,
       g.sacred_stone_level AS sacredStoneLevel,
       COALESCE(mc.memberTotal, 0) AS memberTotal,
       COALESCE(g.member_max_count, 0) AS memberMaxCount,
       g.season_rank AS seasonRank, g.creator, g.create_time AS createTime,
       g.join_mode AS joinMode, g.pvp_status AS pvpStatus
  FROM guild_info g
  ${MEMBER_COUNT_JOIN}`;

function toGuildListItem(row: RowDataPacket): GuildListItem {
  return {
    id: Number(row.id),
    name: row.name ? String(row.name) : "未知公会",
    description: row.description ? String(row.description) : null,
    level: num(row.level),
    money: num(row.money),
    prosperityDegree: num(row.prosperityDegree),
    monthProsperityDegree: num(row.monthProsperityDegree),
    sacredStoneLevel: num(row.sacredStoneLevel),
    memberTotal: num(row.memberTotal),
    memberMaxCount: num(row.memberMaxCount),
    seasonRank: num(row.seasonRank),
    creator: row.creator ? String(row.creator) : null,
    createTime: row.createTime ? formatDateTime(String(row.createTime)) : null,
    joinMode: num(row.joinMode) === 1,
    pvpStatus: num(row.pvpStatus) === 1,
  };
}

export async function getGuildOverview(): Promise<GuildOverview> {
  return cached("overview", async () => {
    const [
      statRows,
      memberRows,
      levelRows,
      prosperityRows,
      monthRows,
      latestRows,
      todaySignInRows,
      trendRows,
      applyRows,
      shopRows,
      pvpRows,
    ] = await Promise.all([
      query<RowDataPacket[]>(
        `SELECT COUNT(*) AS totalGuilds,
                COALESCE(SUM(money), 0) AS totalMoney,
                COALESCE(SUM(prosperity_degree), 0) AS totalProsperity
           FROM guild_info`,
      ),
      query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM guild_player`,
      ),
      query<RowDataPacket[]>(
        `SELECT id, guild_name AS name, level AS value
           FROM guild_info
          ORDER BY level DESC, prosperity_degree DESC, id ASC
          LIMIT 10`,
      ),
      query<RowDataPacket[]>(
        `SELECT id, guild_name AS name, prosperity_degree AS value
           FROM guild_info
          ORDER BY prosperity_degree DESC, id ASC
          LIMIT 10`,
      ),
      query<RowDataPacket[]>(
        `SELECT id, guild_name AS name, month_prosperity_degree AS value
           FROM guild_info
          ORDER BY month_prosperity_degree DESC, id ASC
          LIMIT 10`,
      ),
      query<RowDataPacket[]>(
        `${GUILD_SELECT}
          ORDER BY g.create_time DESC, g.id DESC
          LIMIT 10`,
      ),
      queryIfExists<RowDataPacket[]>(
        "guild_player_sign_in",
        `SELECT COUNT(*) AS total FROM guild_player_sign_in
          WHERE sign_in_time >= CURDATE()`,
      ),
      queryIfExists<RowDataPacket[]>(
        "guild_player_sign_in",
        `SELECT DATE_FORMAT(sign_in_time, '%Y-%m-%d') AS date, COUNT(*) AS total
           FROM guild_player_sign_in
          WHERE sign_in_time >= ?
          GROUP BY DATE_FORMAT(sign_in_time, '%Y-%m-%d')`,
        [
          format(addDays(new Date(), -29), "yyyy-MM-dd") + " 00:00:00",
        ],
      ),
      queryIfExists<RowDataPacket[]>(
        "guild_apply",
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN apply_result = 2 THEN 1 ELSE 0 END), 0) AS approved,
                COALESCE(SUM(CASE WHEN apply_result = 3 THEN 1 ELSE 0 END), 0) AS rejected,
                COALESCE(SUM(CASE WHEN apply_result = 1 THEN 1 ELSE 0 END), 0) AS pending,
                COALESCE(SUM(CASE WHEN apply_result = 4 THEN 1 ELSE 0 END), 0) AS cancelled
           FROM guild_apply`,
      ),
      queryIfExists<RowDataPacket[]>(
        "guild_shop_log",
        `SELECT COUNT(*) AS total FROM guild_shop_log`,
      ),
      queryIfExists<RowDataPacket[]>(
        "guild_pvp_log",
        `SELECT id, type, guild_info_name AS guildName, result, season,
                \`rank\`, start_time AS startTime, end_time AS endTime
           FROM guild_pvp_log
          ORDER BY start_time DESC, id DESC
          LIMIT 10`,
      ),
    ]);

    const stat = statRows[0] ?? {};
    // 趋势按天补零，保证 30 天连续序列；缺表时整体为 null
    const hasSignInTable = await tableExists("guild_player_sign_in");
    const trendMap = new Map(
      trendRows.map((row) => [String(row.date), num(row.total)]),
    );
    const signInTrend = hasSignInTable
      ? Array.from({ length: 30 }, (_, index) => {
          const date = format(addDays(new Date(), index - 29), "yyyy-MM-dd");
          return { date, count: trendMap.get(date) ?? 0 };
        })
      : null;

    return {
      totalGuilds: num(stat.totalGuilds),
      totalMembers: num(memberRows[0]?.total),
      totalMoney: num(stat.totalMoney),
      totalProsperity: num(stat.totalProsperity),
      levelRanking: levelRows.map((row, index) => ({
        rank: index + 1,
        id: Number(row.id),
        name: String(row.name),
        value: num(row.value),
      })),
      prosperityRanking: prosperityRows.map((row, index) => ({
        rank: index + 1,
        id: Number(row.id),
        name: String(row.name),
        value: num(row.value),
      })),
      monthProsperityRanking: monthRows.map((row, index) => ({
        rank: index + 1,
        id: Number(row.id),
        name: String(row.name),
        value: num(row.value),
      })),
      latestGuilds: latestRows.map(toGuildListItem),
      todaySignIns:
        todaySignInRows.length > 0 ? num(todaySignInRows[0].total) : null,
      signInTrend,
      applyStats:
        applyRows.length > 0
          ? {
              total: num(applyRows[0].total),
              approved: num(applyRows[0].approved),
              rejected: num(applyRows[0].rejected),
              pending: num(applyRows[0].pending),
              cancelled: num(applyRows[0].cancelled),
            }
          : null,
      totalShopPurchases:
        shopRows.length > 0 ? num(shopRows[0].total) : null,
      recentPvpLogs:
        pvpRows.length > 0 ? pvpRows.map(toPvpLogEntry) : null,
    };
  });
}

function toPvpLogEntry(row: RowDataPacket): GuildPvpLogEntry {
  return {
    id: Number(row.id),
    type: pvpTypeLabel(row.type ? String(row.type) : null),
    guildName: row.guildName ? String(row.guildName) : "未知公会",
    result: pvpResultLabel(
      row.result === null || row.result === undefined
        ? null
        : num(row.result),
    ),
    season: row.season === null ? null : num(row.season),
    rank: row.rank === null ? null : num(row.rank),
    startTime: row.startTime ? formatDateTime(String(row.startTime)) : null,
    endTime: row.endTime ? formatDateTime(String(row.endTime)) : null,
  };
}

/* ---------- 公会列表（搜索 + 服务端分页 + 动态排序） ---------- */

/** ORDER BY 白名单映射：全部是 SELECT 里的别名 / 列名。 */
const LIST_SORT_EXPR: Record<GuildListSortField, string> = {
  name: "name",
  level: "level",
  members: "memberTotal",
  money: "money",
  prosperity: "prosperityDegree",
  monthProsperity: "monthProsperityDegree",
  createTime: "createTime",
};

export async function getGuildList(input: {
  keyword: string;
  page: number;
  sort: GuildListSortField;
  order: SortOrder;
}): Promise<Paginated<GuildListItem>> {
  const { keyword, page, sort = "members", order = "desc" } = input;
  const where = keyword ? "WHERE g.guild_name LIKE ? OR g.creator LIKE ?" : "";
  const params = keyword ? [`%${keyword}%`, `%${keyword}%`] : [];
  const offset = (page - 1) * PAGE_SIZE;

  const rows = await query<RowDataPacket[]>(
    `${GUILD_SELECT}
      ${where}
      ORDER BY ${LIST_SORT_EXPR[sort]} ${order.toUpperCase()}, id ASC
      LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM guild_info g ${where}`,
    params,
  );

  return {
    items: rows.map(toGuildListItem),
    total: num(countRows[0]?.total),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 公会详情 ---------- */

export async function getGuildDetail(id: number): Promise<GuildDetail | null> {
  const [mainRows, memberCountRows, applyRows, recentApplyRows, pvpRows, pvpPlayerRows, shopRows, shopLogRows] =
    await Promise.all([
      query<RowDataPacket[]>(
        `${GUILD_SELECT}
          WHERE g.id = ?
          LIMIT 1`,
        [id],
      ),
      query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM guild_player WHERE guild_info_id = ?`,
        [id],
      ),
      queryIfExists<RowDataPacket[]>(
        "guild_apply",
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN apply_result = 2 THEN 1 ELSE 0 END), 0) AS approved,
                COALESCE(SUM(CASE WHEN apply_result = 3 THEN 1 ELSE 0 END), 0) AS rejected,
                COALESCE(SUM(CASE WHEN apply_result = 1 THEN 1 ELSE 0 END), 0) AS pending,
                COALESCE(SUM(CASE WHEN apply_result = 4 THEN 1 ELSE 0 END), 0) AS cancelled
           FROM guild_apply
          WHERE guild_info_id = ?`,
        [id],
      ),
      queryIfExists<RowDataPacket[]>(
        "guild_apply",
        `SELECT player_name AS playerName, apply_time AS applyTime,
                apply_result AS result, apply_player_name AS approverName
           FROM guild_apply
          WHERE guild_info_id = ?
          ORDER BY apply_time DESC, id DESC
          LIMIT 20`,
        [id],
      ),
      queryIfExists<RowDataPacket[]>(
        "guild_pvp_log",
        `SELECT id, type, guild_info_name AS guildName, result, season,
                \`rank\`, start_time AS startTime, end_time AS endTime
           FROM guild_pvp_log
          WHERE guild_info_id = ?
          ORDER BY start_time DESC, id DESC
          LIMIT 20`,
        [id],
      ),
      queryIfExists<RowDataPacket[]>(
        "guild_pvp_player_log",
        `SELECT player_name AS playerName, player_uuid AS uuid,
                COUNT(*) AS battles,
                COALESCE(SUM(\`kill\`), 0) AS \`kill\`,
                COALESCE(SUM(die), 0) AS die
           FROM guild_pvp_player_log
          WHERE guild_info_id = ?
          GROUP BY player_uuid, player_name
          ORDER BY \`kill\` DESC, die ASC
          LIMIT 10`,
        [id],
      ),
      queryIfExists<RowDataPacket[]>(
        "guild_shop_log",
        `SELECT COUNT(*) AS total FROM guild_shop_log WHERE guild_info_id = ?`,
        [id],
      ),
      queryIfExists<RowDataPacket[]>(
        "guild_shop_log",
        `SELECT player_name AS playerName, number, buy_time AS buyTime
           FROM guild_shop_log
          WHERE guild_info_id = ?
          ORDER BY buy_time DESC, id DESC
          LIMIT 20`,
        [id],
      ),
    ]);

  const main = mainRows[0];
  if (!main) {
    return null;
  }
  const base = toGuildListItem(main);

  return {
    ...base,
    memberTotal: num(memberCountRows[0]?.total),
    applyStats:
      applyRows.length > 0
        ? {
            total: num(applyRows[0].total),
            approved: num(applyRows[0].approved),
            rejected: num(applyRows[0].rejected),
            pending: num(applyRows[0].pending),
            cancelled: num(applyRows[0].cancelled),
          }
        : null,
    recentApplies:
      recentApplyRows.length > 0
        ? recentApplyRows.map(
            (row): GuildApplyEntry => ({
              playerName: row.playerName
                ? String(row.playerName)
                : "未知玩家",
              applyTime: row.applyTime
                ? formatDateTime(String(row.applyTime))
                : null,
              result: applyResultLabel(num(row.result)),
              approverName: row.approverName
                ? String(row.approverName)
                : null,
            }),
          )
        : null,
    pvpLogs: pvpRows.length > 0 ? pvpRows.map(toPvpLogEntry) : null,
    pvpPlayerRanking:
      pvpPlayerRows.length > 0
        ? pvpPlayerRows.map(
            (row): GuildPvpPlayerEntry => ({
              playerName: row.playerName
                ? String(row.playerName)
                : "未知玩家",
              uuid: String(row.uuid ?? ""),
              battles: num(row.battles),
              kill: num(row.kill),
              die: num(row.die),
            }),
          )
        : null,
    totalShopPurchases:
      shopRows.length > 0 ? num(shopRows[0].total) : null,
    recentShopLogs:
      shopLogRows.length > 0
        ? shopLogRows.map(
            (row): GuildShopLogEntry => ({
              playerName: row.playerName
                ? String(row.playerName)
                : "未知玩家",
              number: num(row.number),
              buyTime: row.buyTime
                ? formatDateTime(String(row.buyTime))
                : null,
            }),
          )
        : null,
  };
}

/* ---------- 公会成员（搜索 + 服务端分页 + 动态排序） ---------- */

/** ORDER BY 白名单映射。 */
const MEMBER_SORT_EXPR: Record<GuildMemberSortField, string> = {
  name: "player_name",
  role: "role_id",
  money: "money",
  weekMoney: "week_money",
  totalMoney: "total_money",
  ore: "ore",
  kill: "`kill`",
  lastJoin: "last_join_time",
};

export async function getGuildMembers(
  guildId: number,
  keyword: string,
  page: number,
  sort: GuildMemberSortField = "totalMoney",
  order: SortOrder = "desc",
): Promise<Paginated<GuildMemberItem>> {
  const where = keyword
    ? "WHERE guild_info_id = ? AND player_name LIKE ?"
    : "WHERE guild_info_id = ?";
  const params = keyword
    ? [guildId, `%${keyword}%`]
    : [guildId];
  const offset = (page - 1) * PAGE_SIZE;

  const rows = await query<RowDataPacket[]>(
    `SELECT player_uuid AS uuid, player_name AS name, role_id AS roleId,
            money, week_money AS weekMoney, total_money AS totalMoney,
            ore, total_ore AS totalOre, \`kill\`, die,
            join_time AS joinTime, last_join_time AS lastJoinTime
       FROM guild_player
       ${where}
      ORDER BY ${MEMBER_SORT_EXPR[sort]} ${order.toUpperCase()}, player_name ASC
      LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM guild_player ${where}`,
    params,
  );

  return {
    items: rows.map(
      (row): GuildMemberItem => ({
        uuid: String(row.uuid ?? ""),
        name: row.name ? String(row.name) : "未知玩家",
        role: roleLabel(num(row.roleId, 3)),
        money: num(row.money),
        weekMoney: num(row.weekMoney),
        totalMoney: num(row.totalMoney),
        ore: num(row.ore),
        totalOre: num(row.totalOre),
        kill: num(row.kill),
        die: num(row.die),
        joinTime: row.joinTime ? formatDateTime(String(row.joinTime)) : null,
        lastJoinTime: row.lastJoinTime
          ? formatDateTime(String(row.lastJoinTime))
          : null,
      }),
    ),
    total: num(countRows[0]?.total),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 全服玩家详情用的轻量摘要 ---------- */

export async function getGuildPlayerSummary(
  uuid: string,
): Promise<GuildPlayerSummary | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT gp.guild_info_id AS guildId, gp.guild_info_name AS guildName,
            gi.level AS guildLevel, gp.role_id AS roleId,
            gp.money, gp.week_money AS weekMoney, gp.total_money AS totalMoney,
            gp.ore, gp.\`kill\`, gp.die, gp.join_time AS joinTime
       FROM guild_player gp
       LEFT JOIN guild_info gi ON gi.id = gp.guild_info_id
      WHERE gp.player_uuid = ?
      LIMIT 1`,
    [uuid],
  );
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    guildId: num(row.guildId),
    guildName: row.guildName ? String(row.guildName) : "未知公会",
    guildLevel: num(row.guildLevel),
    role: roleLabel(num(row.roleId, 3)),
    money: num(row.money),
    weekMoney: num(row.weekMoney),
    totalMoney: num(row.totalMoney),
    ore: num(row.ore),
    kill: num(row.kill),
    die: num(row.die),
    joinTime: row.joinTime ? formatDateTime(String(row.joinTime)) : null,
  };
}
