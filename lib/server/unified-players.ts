import { addDays, format, startOfDay } from "date-fns";
import type { RowDataPacket } from "mysql2/promise";

import { formatDateTime, num } from "@/lib/common/format";
import type { Paginated } from "@/lib/common/types";
import type {
  PlayerSortKey,
  TimelineEvent,
  UnifiedPlayerDetail,
  UnifiedPlayerItem,
} from "@/lib/common/unified";
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
import { getWarpPlayerSummary } from "@/lib/plugins/playerwarp/queries";
import { getCurrencyPlayerSummary } from "@/lib/plugins/playercurrency/queries";
import { getIntensifyPlayerDetail } from "@/lib/plugins/playerintensify/queries";
import { getGuildPlayerSummary } from "@/lib/plugins/playerguild/queries";
import { getLuckPermsPlayerSummary } from "@/lib/plugins/luckperms/queries";
import { getTopPlayerSummary } from "@/lib/plugins/playertop/queries";
import { createCache } from "@/lib/server/cache";
import {
  buildPlayerRegistry,
  type RegistryEntry,
} from "@/lib/server/player-registry";
import { getEnabledPlugins, query } from "@/lib/server/mysql";

/**
 * 玩家中心聚合查询：跨插件的统一玩家列表 / 详情 / 活动时间线。
 *
 * 自注册结构：各插件以「源」的形式登记在下方三个注册表
 * （STAT_SOURCES / DETAIL_SOURCES / TIMELINE_SOURCES）中，
 * 新增插件时在此登记一条即可接入，无需改动装载主体。
 * 源内部只编排插件已有查询与轻量聚合 SQL，插件包自身不做修改。
 */

const DATE_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss";

/** SQL 参数用的日期字符串。 */
function toSqlDateTime(date: Date): string {
  return format(date, DATE_TIME_FORMAT);
}
const PAGE_SIZE = 20;

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

const unifiedCache = createCache("unified-players");

/** 玩家中心统计快照：目录 + 各插件聚合键（缓存内共享，消费端只读）。 */
interface PlayerStatsSnapshot {
  registry: RegistryEntry[];
  onlineSet: ReadonlySet<string>;
  playtimeSeconds: ReadonlyMap<string, number>;
  signinCounts: ReadonlyMap<string, number>;
  companionCounts: ReadonlyMap<string, number>;
  companionCoins: ReadonlyMap<string, number>;
  titleCoins: ReadonlyMap<string, number>;
  taskCoins: ReadonlyMap<string, number>;
  warpCounts: ReadonlyMap<string, number>;
  currencyTypes: ReadonlyMap<string, number>;
  intensifyAttempts: ReadonlyMap<string, number>;
  guildNames: ReadonlyMap<string, string>;
  primaryGroups: ReadonlyMap<string, string>;
}

/* ---------- 统计源注册表：接入玩家列表 ---------- */

/** 单个插件向统计快照贡献的统计键（未贡献的键保持空容器）。 */
type StatContribution = Partial<Omit<PlayerStatsSnapshot, "registry">>;

/** 统计源：load 内每类统计一条聚合 SQL，禁止循环逐玩家查询。 */
interface StatSource {
  /** 依赖的插件 id（lib/common/plugins 登记的 id） */
  pluginId: string;
  /** 装载统计键；单个源失败按空贡献降级并记录日志，不影响其余插件。 */
  load: () => Promise<StatContribution>;
}

const STAT_SOURCES: readonly StatSource[] = [
  {
    pluginId: "playertime",
    load: async () => {
      const onlineSet = new Set<string>();
      const playtimeSeconds = new Map<string, number>();
      const [onlineRows, secondsRows] = await Promise.all([
        query<RowDataPacket[]>(
          `SELECT DISTINCT player_uuid AS uuid FROM player_time_record WHERE quit_time IS NULL`,
        ),
        query<RowDataPacket[]>(
          `SELECT player_uuid AS uuid, \`second\` AS seconds FROM player_time`,
        ),
      ]);
      for (const row of onlineRows) {
        onlineSet.add(String(row.uuid));
      }
      for (const row of secondsRows) {
        playtimeSeconds.set(String(row.uuid), num(row.seconds));
      }
      return { onlineSet, playtimeSeconds };
    },
  },
  {
    pluginId: "playersignin",
    load: async () => {
      const signinCounts = new Map<string, number>();
      const rows = await query<RowDataPacket[]>(
        `SELECT player_uuid AS uuid, COUNT(*) AS signs FROM player_sign_in GROUP BY player_uuid`,
      );
      for (const row of rows) {
        signinCounts.set(String(row.uuid), num(row.signs));
      }
      return { signinCounts };
    },
  },
  {
    pluginId: "companions",
    load: async () => {
      const companionCounts = new Map<string, number>();
      const companionCoins = new Map<string, number>();
      const [countRows, coinRows] = await Promise.all([
        query<RowDataPacket[]>(
          `SELECT player_uuid AS uuid, COUNT(*) AS total FROM companions_owned GROUP BY player_uuid`,
        ),
        query<RowDataPacket[]>(
          `SELECT player_uuid AS uuid, coins FROM companions_coin`,
        ),
      ]);
      for (const row of countRows) {
        companionCounts.set(String(row.uuid), num(row.total));
      }
      for (const row of coinRows) {
        if (row.coins !== null && row.coins !== undefined) {
          companionCoins.set(String(row.uuid), num(row.coins));
        }
      }
      return { companionCounts, companionCoins };
    },
  },
  {
    pluginId: "playertitle",
    load: async () => {
      const titleCoins = new Map<string, number>();
      const rows = await query<RowDataPacket[]>(
        `SELECT player_uuid AS uuid, amount FROM title_coin`,
      );
      for (const row of rows) {
        if (row.uuid !== null && row.amount !== null && row.amount !== undefined) {
          titleCoins.set(String(row.uuid), num(row.amount));
        }
      }
      return { titleCoins };
    },
  },
  {
    pluginId: "playertask",
    load: async () => {
      const taskCoins = new Map<string, number>();
      const rows = await query<RowDataPacket[]>(
        `SELECT player_uuid AS uuid, MAX(amount) AS amount
           FROM task_coin
          WHERE player_uuid IS NOT NULL
          GROUP BY player_uuid`,
      );
      for (const row of rows) {
        if (row.amount !== null && row.amount !== undefined) {
          taskCoins.set(String(row.uuid), num(row.amount));
        }
      }
      return { taskCoins };
    },
  },
  {
    pluginId: "playerwarp",
    load: async () => {
      const warpCounts = new Map<string, number>();
      const rows = await query<RowDataPacket[]>(
        `SELECT player_uuid AS uuid, COUNT(*) AS total
           FROM warp_player
          WHERE player_uuid IS NOT NULL
          GROUP BY player_uuid`,
      );
      for (const row of rows) {
        warpCounts.set(String(row.uuid), num(row.total));
      }
      return { warpCounts };
    },
  },
  {
    pluginId: "playercurrency",
    load: async () => {
      const currencyTypes = new Map<string, number>();
      const rows = await query<RowDataPacket[]>(
        `SELECT player_uuid AS uuid, COUNT(*) AS total
           FROM player_currency
          WHERE player_uuid IS NOT NULL
          GROUP BY player_uuid`,
      );
      for (const row of rows) {
        currencyTypes.set(String(row.uuid), num(row.total));
      }
      return { currencyTypes };
    },
  },
  {
    pluginId: "playerintensify",
    load: async () => {
      const intensifyAttempts = new Map<string, number>();
      const rows = await query<RowDataPacket[]>(
        "SELECT player_uuid AS uuid, `sum` AS attempts FROM player_intensify",
      );
      for (const row of rows) {
        intensifyAttempts.set(String(row.uuid), num(row.attempts));
      }
      return { intensifyAttempts };
    },
  },
  {
    pluginId: "playerguild",
    load: async () => {
      const guildNames = new Map<string, string>();
      const rows = await query<RowDataPacket[]>(
        `SELECT gp.player_uuid AS uuid, gi.guild_name AS guildName
           FROM guild_player gp
           JOIN guild_info gi ON gi.id = gp.guild_info_id`,
      );
      for (const row of rows) {
        if (row.uuid !== null && row.guildName) {
          guildNames.set(String(row.uuid), String(row.guildName));
        }
      }
      return { guildNames };
    },
  },
  {
    pluginId: "luckperms",
    load: async () => {
      const primaryGroups = new Map<string, string>();
      const rows = await query<RowDataPacket[]>(
        `SELECT uuid, primary_group AS primaryGroup FROM luckperms_players`,
      );
      for (const row of rows) {
        if (row.uuid !== null && row.primaryGroup) {
          primaryGroups.set(String(row.uuid), String(row.primaryGroup));
        }
      }
      return { primaryGroups };
    },
  },
];

/** 空快照：所有统计键的缺省容器，供未启用 / 装载失败的源保持空值。 */
function emptyStats(registry: RegistryEntry[]): PlayerStatsSnapshot {
  return {
    registry,
    onlineSet: new Set(),
    playtimeSeconds: new Map(),
    signinCounts: new Map(),
    companionCounts: new Map(),
    companionCoins: new Map(),
    titleCoins: new Map(),
    taskCoins: new Map(),
    warpCounts: new Map(),
    currencyTypes: new Map(),
    intensifyAttempts: new Map(),
    guildNames: new Map(),
    primaryGroups: new Map(),
  };
}

/**
 * 加载玩家中心统计快照（30 秒缓存）。
 * 各统计源并行装载；筛选 / 排序 / 分页全部在快照之上内存计算，
 * 翻页与搜索不再重复触发全量聚合 SQL。
 */
async function loadPlayerStats(): Promise<PlayerStatsSnapshot> {
  return unifiedCache("stats", async () => {
    const [plugins, registry] = await Promise.all([
      getEnabledPlugins(),
      buildPlayerRegistry(),
    ]);
    const enabled = new Set(plugins.map((plugin) => plugin.id));
    const stats = emptyStats(registry);

    const contributions = await Promise.all(
      STAT_SOURCES.filter((source) => enabled.has(source.pluginId)).map(
        async (source) => {
          try {
            return await source.load();
          } catch (error) {
            // 单个插件统计失败按空贡献降级，玩家中心整体仍可用
            console.error(
              `[unified-players] 统计源 ${source.pluginId} 装载失败，已降级为空`,
              error,
            );
            return {};
          }
        },
      ),
    );
    Object.assign(stats, ...contributions);
    return stats;
  });
}

/** 统一玩家列表：目录 + 各插件统计键（列表页只做键值聚合，不 join 明细）。 */
export async function getUnifiedPlayers(
  keyword: string,
  page: number,
  sort: PlayerSortKey,
): Promise<Paginated<UnifiedPlayerItem>> {
  const stats = await loadPlayerStats();

  const lowered = keyword.toLowerCase();
  const filtered = stats.registry.filter((entry) =>
    keyword ? entry.name.toLowerCase().includes(lowered) : true,
  );

  const nameToUuid = new Map<string, string>();
  for (const entry of stats.registry) {
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
      online: uuid ? stats.onlineSet.has(uuid) : false,
      totalSeconds: uuid ? (stats.playtimeSeconds.get(uuid) ?? 0) : 0,
      totalSigns: uuid ? (stats.signinCounts.get(uuid) ?? 0) : 0,
      companionCount: uuid ? (stats.companionCounts.get(uuid) ?? 0) : 0,
      companionCoins: uuid ? (stats.companionCoins.get(uuid) ?? null) : null,
      titleCoins: uuid ? (stats.titleCoins.get(uuid) ?? null) : null,
      taskCoins: uuid ? (stats.taskCoins.get(uuid) ?? null) : null,
      warpCount: uuid ? (stats.warpCounts.get(uuid) ?? 0) : 0,
      currencyTypes: uuid ? (stats.currencyTypes.get(uuid) ?? 0) : 0,
      intensifyAttempts: uuid ? (stats.intensifyAttempts.get(uuid) ?? 0) : 0,
      guildName: uuid ? (stats.guildNames.get(uuid) ?? null) : null,
      primaryGroup: uuid ? (stats.primaryGroups.get(uuid) ?? null) : null,
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
      case "intensify":
        return (
          b.intensifyAttempts - a.intensifyAttempts ||
          a.name.localeCompare(b.name)
        );
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

/* ---------- 详情源注册表：接入玩家详情页 ---------- */

/** 详情源：collect 向草稿 detail 写入本插件区块，可并行执行。 */
interface DetailSource {
  pluginId: string;
  /** 默认依赖 uuid；按用户名查询的源（AuthMe）设为 false。 */
  requiresUuid?: boolean;
  collect: (ctx: {
    uuid: string;
    name: string;
    detail: UnifiedPlayerDetail;
  }) => Promise<void>;
}

const DETAIL_SOURCES: readonly DetailSource[] = [
  {
    pluginId: "playertime",
    collect: async ({ uuid, detail }) => {
      const [player, trend] = await Promise.all([
        getPlayerDetail(uuid),
        getTrend("30d", uuid),
      ]);
      if (player) {
        detail.online = detail.online || player.online;
        detail.playtime = {
          todaySeconds: player.todaySeconds,
          weekSeconds: player.weekSeconds,
          monthSeconds: player.monthSeconds,
          totalSeconds: player.totalSeconds,
          trend: trend.map((point) => ({
            date: point.date,
            seconds: point.seconds,
          })),
        };
      }
    },
  },
  {
    pluginId: "playersignin",
    collect: async ({ uuid, detail }) => {
      const record = await getSignInPlayerDetail(uuid);
      if (record) {
        detail.signin = {
          totalSigns: record.totalSigns,
          monthSigns: record.monthSigns,
          streak: record.streak,
          cards: record.cards,
          monthDays: record.monthDays,
        };
      }
    },
  },
  {
    pluginId: "authme",
    requiresUuid: false,
    collect: async ({ name, detail }) => {
      const account = await getAuthmeAccountDetail(name);
      if (account) {
        detail.online = detail.online || account.logged;
        detail.authme = {
          username: account.username,
          email: account.email,
          regIp: account.regIp,
          ip: account.ip,
          lastLoginAt: account.lastLoginAt,
          logged: account.logged,
          world: account.world,
          x: account.x,
          y: account.y,
          z: account.z,
        };
      }
    },
  },
  {
    pluginId: "companions",
    collect: async ({ uuid, detail }) => {
      const record = await getCompanionsPlayerDetail(uuid);
      if (record) {
        detail.companions = {
          totalCompanions: record.companions.length,
          coins: record.coins,
          activeCompanion: record.activeCompanion,
          maxAbilityLevel: Math.max(
            ...record.companions.map((item) => item.abilityLevel),
            0,
          ),
        };
      }
    },
  },
  {
    pluginId: "playertitle",
    collect: async ({ uuid, detail }) => {
      const summary = await getTitlePlayerSummary(uuid);
      if (summary) {
        detail.playertitle = {
          usingTitle: summary.usingTitle,
          titleCount: summary.titleCount,
          coins: summary.coins,
        };
      }
    },
  },
  {
    pluginId: "playertask",
    collect: async ({ uuid, detail }) => {
      const summary = await getTaskPlayerSummary(uuid);
      if (summary) {
        detail.task = {
          coins: summary.coins,
          dailyCompleted: summary.dailyCompleted,
          npcCompleted: summary.npcCompleted,
          reelCompleted: summary.reelCompleted,
          lastTaskAt: summary.lastTaskAt,
        };
      }
    },
  },
  {
    pluginId: "playerwarp",
    collect: async ({ uuid, detail }) => {
      const summary = await getWarpPlayerSummary(uuid);
      if (summary) {
        detail.playerwarp = {
          warpCount: summary.warpCount,
          displayedCount: summary.displayedCount,
          totalTp: summary.totalTp,
          lastCreateAt: summary.lastCreateAt,
        };
      }
    },
  },
  {
    pluginId: "playercurrency",
    collect: async ({ uuid, detail }) => {
      const summary = await getCurrencyPlayerSummary(uuid);
      if (summary) {
        detail.playercurrency = {
          typeCount: summary.typeCount,
          topType: summary.topType,
          topBalance: summary.topBalance,
          lastChangeAt: summary.lastChangeAt,
        };
      }
    },
  },
  {
    pluginId: "playerintensify",
    collect: async ({ uuid, detail }) => {
      const record = await getIntensifyPlayerDetail(uuid);
      if (record) {
        detail.intensify = {
          totalAttempts: record.totalAttempts,
          succeedNum: record.succeedNum,
          failureNum: record.failureNum,
          levelOffNum: record.levelOffNum,
          vanishNum: record.vanishNum,
          successRate: record.successRate,
          maxLevel: record.maxLevel,
          maxLevelName: record.maxLevelName,
          materialName: record.materialName,
        };
      }
    },
  },
  {
    pluginId: "playerguild",
    collect: async ({ uuid, detail }) => {
      const summary = await getGuildPlayerSummary(uuid);
      if (summary) {
        detail.guild = {
          guildId: summary.guildId,
          guildName: summary.guildName,
          guildLevel: summary.guildLevel,
          role: summary.role,
          money: summary.money,
          weekMoney: summary.weekMoney,
          totalMoney: summary.totalMoney,
          ore: summary.ore,
          kill: summary.kill,
          die: summary.die,
          joinTime: summary.joinTime,
        };
      }
    },
  },
  {
    pluginId: "luckperms",
    collect: async ({ uuid, detail }) => {
      const summary = await getLuckPermsPlayerSummary(uuid);
      if (summary) {
        detail.luckperms = {
          primaryGroup: summary.primaryGroup,
          directPermissionCount: summary.directPermissionCount,
        };
      }
    },
  },
  {
    pluginId: "playertop",
    collect: async ({ uuid, detail }) => {
      const summary = await getTopPlayerSummary(uuid);
      if (summary) {
        detail.playertop = {
          rankCount: summary.rankCount,
          bestRank: summary.bestRank,
          bestPapi: summary.bestPapi,
          lastUpdateAt: summary.lastUpdateAt,
        };
      }
    },
  },
];

/** 统一玩家详情（30 秒缓存）：并行编排各插件已有查询。 */
export async function getUnifiedPlayerDetail(
  key: string,
): Promise<UnifiedPlayerDetail | null> {
  return unifiedCache(`detail:${key}`, () => loadUnifiedPlayerDetail(key));
}

async function loadUnifiedPlayerDetail(
  key: string,
): Promise<UnifiedPlayerDetail | null> {
  const entry = await findEntry(key);
  if (!entry) return null;
  const plugins = await getEnabledPlugins();
  const enabled = new Set(plugins.map((plugin) => plugin.id));

  const detail: UnifiedPlayerDetail = {
    key: entry.key,
    uuid: entry.uuid,
    name: entry.name,
    registeredAt: entry.registeredAt,
    sources: entry.sources,
    lastActiveAt: entry.lastActiveAt,
    online: false,
    playtime: null,
    signin: null,
    authme: null,
    companions: null,
    playertitle: null,
    task: null,
    playerwarp: null,
    playercurrency: null,
    intensify: null,
    guild: null,
    luckperms: null,
    playertop: null,
  };

  const active = DETAIL_SOURCES.filter(
    (source) =>
      enabled.has(source.pluginId) &&
      (source.requiresUuid === false || entry.uuid),
  );
  const ctx = { uuid: entry.uuid ?? "", name: entry.name, detail };
  await Promise.all(active.map((source) => source.collect(ctx)));

  return detail;
}

/* ---------- 时间线源注册表：接入活动时间线 ---------- */

/** 时间线源：collect 向共享 events 数组追加本插件事件。 */
interface TimelineSource {
  pluginId: string;
  /** 默认依赖 uuid；按用户名查询的源（AuthMe）设为 false。 */
  requiresUuid?: boolean;
  collect: (ctx: {
    uuid: string;
    name: string;
    events: TimelineEvent[];
  }) => Promise<void>;
}

const TIMELINE_SOURCES: readonly TimelineSource[] = [
  {
    pluginId: "playertime",
    collect: async ({ uuid, events }) => {
      const weekAgo = toSqlDateTime(startOfDay(addDays(new Date(), -7)));
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
    },
  },
  {
    pluginId: "playersignin",
    collect: async ({ uuid, events }) => {
      const items = await getRecentSignInRecords(uuid, 50);
      for (const record of items) {
        events.push({
          at: record.signInDate,
          type: "signin",
          text: `签到（当日第 ${record.rank} 名）`,
        });
      }
    },
  },
  {
    pluginId: "authme",
    requiresUuid: false,
    collect: async ({ name, events }) => {
      const account = await getAuthmeAccountDetail(name);
      if (account?.lastLoginAt) {
        events.push({
          at: account.lastLoginAt,
          type: "login",
          text: `通过 AuthMe 登录${account.ip ? `（IP ${account.ip}）` : ""}`,
        });
      }
    },
  },
  {
    pluginId: "playerguild",
    collect: async ({ uuid, events }) => {
      const summary = await getGuildPlayerSummary(uuid);
      if (summary?.joinTime) {
        events.push({
          at: summary.joinTime,
          type: "guild",
          text: `加入公会 ${summary.guildName}`,
        });
      }
    },
  },
];

/** 活动时间线（30 秒缓存）：合并登录（AuthMe）、会话（PlayerTime）、签到（PlayerSignIn）事件。 */
export async function getUnifiedPlayerTimeline(
  key: string,
  limit = 100,
): Promise<TimelineEvent[]> {
  return unifiedCache(`timeline:${key}:${limit}`, () =>
    loadUnifiedPlayerTimeline(key, limit),
  );
}

async function loadUnifiedPlayerTimeline(
  key: string,
  limit = 100,
): Promise<TimelineEvent[]> {
  const entry = await findEntry(key);
  if (!entry) return [];
  const plugins = await getEnabledPlugins();
  const enabled = new Set(plugins.map((plugin) => plugin.id));

  const events: TimelineEvent[] = [];
  const active = TIMELINE_SOURCES.filter(
    (source) =>
      enabled.has(source.pluginId) &&
      (source.requiresUuid === false || entry.uuid),
  );
  const ctx = { uuid: entry.uuid ?? "", name: entry.name, events };
  await Promise.all(active.map((source) => source.collect(ctx)));

  return events
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
