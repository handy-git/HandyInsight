import { addDays, format, startOfDay } from "date-fns";
import type { RowDataPacket } from "mysql2/promise";

import { formatDateTime } from "@/lib/common/format";
import type { Paginated } from "@/lib/common/types";
import { getPlayerDetail, getTrend } from "@/lib/plugins/playertime/queries";
import {
  getRecentSignInRecords,
  getSignInPlayerDetail,
} from "@/lib/plugins/playersignin/queries";
import { getAuthmeAccountDetail } from "@/lib/plugins/authme/queries";
import {
  getCompanionsPlayerDetail,
} from "@/lib/plugins/companions/queries";
import { getTitlePlayerSummary } from "@/lib/plugins/playertitle/queries";
import { getTaskPlayerSummary } from "@/lib/plugins/playertask/queries";
import {
  buildPlayerRegistry,
  type RegistryEntry,
} from "@/lib/server/player-registry";
import { getEnabledPlugins, query } from "@/lib/server/mysql";

/**
 * 玩家中心聚合查询：跨插件的统一玩家列表 / 详情 / 活动时间线。
 * 只编排各插件已有的查询与轻量聚合 SQL，插件包自身不做修改。
 */

const DATE_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss";

/** SQL 参数用的日期字符串。 */
function toSqlDateTime(date: Date): string {
  return format(date, DATE_TIME_FORMAT);
}
const PAGE_SIZE = 20;

import type {
  PlayerSortKey,
  TimelineEvent,
  UnifiedPlayerDetail,
  UnifiedPlayerItem,
} from "@/lib/common/unified";

function formatSeconds(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} 天 ${hours} 小时`;
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`;
  if (minutes > 0) return `${minutes} 分钟`;
  return `${seconds % 60} 秒`;
}

/** 统一玩家列表：目录 + 各插件统计键（列表页只做键值聚合，不 join 明细）。 */
export async function getUnifiedPlayers(
  keyword: string,
  page: number,
  sort: PlayerSortKey,
): Promise<Paginated<UnifiedPlayerItem>> {
  const plugins = await getEnabledPlugins();
  const enabled = new Set(plugins.map((plugin) => plugin.id));
  const registry = await buildPlayerRegistry();

  const lowered = keyword.toLowerCase();
  const filtered = registry.filter((entry) =>
    keyword ? entry.name.toLowerCase().includes(lowered) : true,
  );

  // 在线集合与统计键：小表全量拉取后在内存对齐（规模受注册玩家数约束），
  // 每类统计一条聚合 SQL，禁止循环逐玩家查询
  const onlineSet = new Set<string>();
  const playtimeSeconds = new Map<string, number>();
  const signinCounts = new Map<string, number>();
  const companionCounts = new Map<string, number>();
  const companionCoins = new Map<string, number>();
  const titleCoins = new Map<string, number>();
  const taskCoins = new Map<string, number>();

  if (enabled.has("playertime")) {
    const onlineRows = await query<RowDataPacket[]>(
      `SELECT DISTINCT player_uuid AS uuid FROM player_time_record WHERE quit_time IS NULL`,
    );
    for (const row of onlineRows) {
      onlineSet.add(String(row.uuid));
    }
    const secondsRows = await query<RowDataPacket[]>(
      `SELECT player_uuid AS uuid, \`second\` AS seconds FROM player_time`,
    );
    for (const row of secondsRows) {
      playtimeSeconds.set(String(row.uuid), Number(row.seconds));
    }
  }

  if (enabled.has("playersignin")) {
    const signRows = await query<RowDataPacket[]>(
      `SELECT player_uuid AS uuid, COUNT(*) AS signs FROM player_sign_in GROUP BY player_uuid`,
    );
    for (const row of signRows) {
      signinCounts.set(String(row.uuid), Number(row.signs));
    }
  }

  if (enabled.has("companions")) {
    const [countRows, coinRows] = await Promise.all([
      query<RowDataPacket[]>(
        `SELECT player_uuid AS uuid, COUNT(*) AS total FROM companions_owned GROUP BY player_uuid`,
      ),
      query<RowDataPacket[]>(
        `SELECT player_uuid AS uuid, coins FROM companions_coin`,
      ),
    ]);
    for (const row of countRows) {
      companionCounts.set(String(row.uuid), Number(row.total));
    }
    for (const row of coinRows) {
      if (row.coins !== null && row.coins !== undefined) {
        companionCoins.set(String(row.uuid), Number(row.coins));
      }
    }
  }

  if (enabled.has("playertitle")) {
    const coinRows = await query<RowDataPacket[]>(
      `SELECT player_uuid AS uuid, amount FROM title_coin`,
    );
    for (const row of coinRows) {
      if (row.uuid !== null && row.amount !== null && row.amount !== undefined) {
        titleCoins.set(String(row.uuid), Number(row.amount));
      }
    }
  }

  if (enabled.has("playertask")) {
    const coinRows = await query<RowDataPacket[]>(
      `SELECT player_uuid AS uuid, MAX(amount) AS amount
         FROM task_coin
        WHERE player_uuid IS NOT NULL
        GROUP BY player_uuid`,
    );
    for (const row of coinRows) {
      if (row.amount !== null && row.amount !== undefined) {
        taskCoins.set(String(row.uuid), Number(row.amount));
      }
    }
  }

  const nameToUuid = new Map<string, string>();
  for (const entry of registry) {
    if (entry.uuid) {
      nameToUuid.set(entry.name.toLowerCase(), entry.uuid);
    }
  }

  const items = filtered.map((entry) => {
    const uuid = entry.uuid ?? nameToUuid.get(entry.name.toLowerCase()) ?? null;
    return {
      key: entry.key,
      uuid,
      name: entry.name,
      registeredAt: entry.registeredAt,
      sources: entry.sources,
      lastActiveAt: entry.lastActiveAt,
      online: uuid ? onlineSet.has(uuid) : false,
      totalSeconds: uuid ? (playtimeSeconds.get(uuid) ?? 0) : 0,
      totalSigns: uuid ? (signinCounts.get(uuid) ?? 0) : 0,
      companionCount: uuid ? (companionCounts.get(uuid) ?? 0) : 0,
      companionCoins: uuid ? (companionCoins.get(uuid) ?? null) : null,
      titleCoins: uuid ? (titleCoins.get(uuid) ?? null) : null,
      taskCoins: uuid ? (taskCoins.get(uuid) ?? null) : null,
    };
  });

  const sorted = [...items].sort((a, b) => {
    switch (sort) {
      case "registered":
        return (b.registeredAt ?? "").localeCompare(a.registeredAt ?? "");
      case "playtime":
        return b.totalSeconds - a.totalSeconds || a.name.localeCompare(b.name);
      case "signin":
        return b.totalSigns - a.totalSigns || a.name.localeCompare(b.name);
      case "recent":
      default:
        return (
          (b.lastActiveAt ?? "").localeCompare(a.lastActiveAt ?? "") ||
          a.name.localeCompare(b.name)
        );
    }
  });

  const total = sorted.length;
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(start, start + PAGE_SIZE);

  return { items: pageItems, total, page, pageSize: PAGE_SIZE };
}

async function findEntry(key: string): Promise<RegistryEntry | null> {
  const registry = await buildPlayerRegistry();
  return registry.find((entry) => entry.key === key) ?? null;
}

/** 统一玩家详情：并行编排各插件已有查询。 */
export async function getUnifiedPlayerDetail(
  key: string,
): Promise<UnifiedPlayerDetail | null> {
  const entry = await findEntry(key);
  if (!entry) return null;
  const plugins = await getEnabledPlugins();
  const enabled = new Set(plugins.map((plugin) => plugin.id));
  const uuid = entry.uuid;

  const tasks: Promise<void>[] = [];
  let playtime: UnifiedPlayerDetail["playtime"] = null;
  let signin: UnifiedPlayerDetail["signin"] = null;
  let authme: UnifiedPlayerDetail["authme"] = null;
  let companions: UnifiedPlayerDetail["companions"] = null;
  let playertitle: UnifiedPlayerDetail["playertitle"] = null;
  let task: UnifiedPlayerDetail["task"] = null;
  let online = false;

  if (uuid && enabled.has("playertime")) {
    tasks.push(
      (async () => {
        const [detail, trend] = await Promise.all([
          getPlayerDetail(uuid),
          getTrend("30d", uuid),
        ]);
        if (detail) {
          online = online || detail.online;
          playtime = {
            todaySeconds: detail.todaySeconds,
            weekSeconds: detail.weekSeconds,
            monthSeconds: detail.monthSeconds,
            totalSeconds: detail.totalSeconds,
            trend: trend.map((point) => ({
              date: point.date,
              seconds: point.seconds,
            })),
          };
        }
      })(),
    );
  }

  if (uuid && enabled.has("playersignin")) {
    tasks.push(
      (async () => {
        const detail = await getSignInPlayerDetail(uuid);
        if (detail) {
          signin = {
            totalSigns: detail.totalSigns,
            monthSigns: detail.monthSigns,
            streak: detail.streak,
            cards: detail.cards,
            monthDays: detail.monthDays,
          };
        }
      })(),
    );
  }

  if (enabled.has("authme")) {
    tasks.push(
      (async () => {
        const detail = await getAuthmeAccountDetail(entry.name);
        if (detail) {
          online = online || detail.logged;
          authme = {
            username: detail.username,
            email: detail.email,
            regIp: detail.regIp,
            ip: detail.ip,
            lastLoginAt: detail.lastLoginAt,
            logged: detail.logged,
            world: detail.world,
            x: detail.x,
            y: detail.y,
            z: detail.z,
          };
        }
      })(),
    );
  }

  if (uuid && enabled.has("companions")) {
    tasks.push(
      (async () => {
        const detail = await getCompanionsPlayerDetail(uuid);
        if (detail) {
          companions = {
            totalCompanions: detail.companions.length,
            coins: detail.coins,
            activeCompanion: detail.activeCompanion,
            maxAbilityLevel: Math.max(
              ...detail.companions.map((item) => item.abilityLevel),
              0,
            ),
          };
        }
      })(),
    );
  }

  if (uuid && enabled.has("playertitle")) {
    tasks.push(
      (async () => {
        const summary = await getTitlePlayerSummary(uuid);
        if (summary) {
          playertitle = {
            usingTitle: summary.usingTitle,
            titleCount: summary.titleCount,
            coins: summary.coins,
          };
        }
      })(),
    );
  }

  if (uuid && enabled.has("playertask")) {
    tasks.push(
      (async () => {
        const summary = await getTaskPlayerSummary(uuid);
        if (summary) {
          task = {
            coins: summary.coins,
            dailyCompleted: summary.dailyCompleted,
            npcCompleted: summary.npcCompleted,
            reelCompleted: summary.reelCompleted,
            lastTaskAt: summary.lastTaskAt,
          };
        }
      })(),
    );
  }

  await Promise.all(tasks);

  return {
    key: entry.key,
    uuid,
    name: entry.name,
    registeredAt: entry.registeredAt,
    sources: entry.sources,
    lastActiveAt: entry.lastActiveAt,
    online,
    playtime,
    signin,
    authme,
    companions,
    playertitle,
    task,
  };
}

/** 活动时间线：合并登录（AuthMe）、会话（PlayerTime）、签到（PlayerSignIn）事件。 */
export async function getUnifiedPlayerTimeline(
  key: string,
  limit = 100,
): Promise<TimelineEvent[]> {
  const entry = await findEntry(key);
  if (!entry) return [];
  const plugins = await getEnabledPlugins();
  const enabled = new Set(plugins.map((plugin) => plugin.id));
  const uuid = entry.uuid;
  const events: TimelineEvent[] = [];

  const tasks: Promise<void>[] = [];
  const weekAgo = toSqlDateTime(startOfDay(addDays(new Date(), -7)));

  if (uuid && enabled.has("playertime")) {
    tasks.push(
      (async () => {
        const rows = await query<RowDataPacket[]>(
          `SELECT login_time AS loginTime, quit_time AS quitTime
             FROM player_time_record
            WHERE player_uuid = ? AND login_time >= ?
            ORDER BY login_time DESC
            LIMIT 200`,
          [uuid, weekAgo],
        );
        for (const row of rows) {
          const login = formatDateTime(String(row.loginTime));
          events.push({ at: login, type: "login", text: "进入服务器" });
          if (row.quitTime) {
            const quit = formatDateTime(String(row.quitTime));
            const duration = formatSeconds(
              (new Date(quit.replace(" ", "T")).getTime() -
                new Date(login.replace(" ", "T")).getTime()) /
                1000,
            );
            events.push({ at: quit, type: "session", text: `下线（本次 ${duration}）` });
          } else {
            events.push({ at: login, type: "session", text: "当前会话进行中" });
          }
        }
      })(),
    );
  }

  if (uuid && enabled.has("playersignin")) {
    tasks.push(
      (async () => {
        const items = await getRecentSignInRecords(uuid, 50);
        for (const record of items) {
          events.push({
            at: record.signInDate,
            type: "signin",
            text: `签到（当日第 ${record.rank} 名）`,
          });
        }
      })(),
    );
  }

  if (enabled.has("authme")) {
    tasks.push(
      (async () => {
        const detail = await getAuthmeAccountDetail(entry.name);
        if (detail?.lastLoginAt) {
          events.push({
            at: detail.lastLoginAt,
            type: "login",
            text: `通过 AuthMe 登录${detail.ip ? `（IP ${detail.ip}）` : ""}`,
          });
        }
      })(),
    );
  }

  await Promise.all(tasks);
  return events
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
