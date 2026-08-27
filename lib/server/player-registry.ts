import type { RowDataPacket } from "mysql2/promise";

import { formatDateTime } from "@/lib/common/format";
import { getEnabledPlugins, query } from "@/lib/server/mysql";

/**
 * 玩家目录聚合服务。
 *
 * 以 UUID 为主键聚合各插件数据；AuthMe 无 UUID，按名称桥接。
 * AuthMe 启用时它就是权威“玩家全集”（含注册未上线的玩家）；
 * 未启用时退化为 PlayerTime ∪ PlayerSignIn 的并集，功能照常。
 */

export interface RegistryEntry {
  /** 主键：UUID（无 UUID 的 AuthMe 独有玩家使用 name: 前缀的虚拟键） */
  key: string;
  uuid: string | null;
  /** 展示名（优先 AuthMe realname，其次各插件记录名） */
  name: string;
  /** 最早注册时间（仅 AuthMe），yyyy-MM-dd HH:mm:ss */
  registeredAt: string | null;
  /** 数据来源插件 id 集合 */
  sources: string[];
  /** 最近活跃时间：优先 PlayerTime（最后登录），无记录时退到 AuthMe（lastlogin），不取其他插件 */
  lastActiveAt: string | null;
}

interface CacheEntry {
  value: RegistryEntry[];
  expiresAt: number;
}

const CACHE_TTL_MS = 30_000;
let cache: CacheEntry | null = null;

/** 各插件按名称归一化（MySQL username 为小写；PlayerTime/SignIn 存原样）。 */
function normalizeName(name: string): string {
  return name.toLowerCase();
}

async function fetchPlayerTime(): Promise<RowDataPacket[]> {
  return query<RowDataPacket[]>(
    `SELECT player_uuid AS uuid, MAX(player_name) AS name,
            MAX(login_time) AS lastActiveAt
       FROM (
         SELECT pt.player_uuid, pt.player_name, NULL AS login_time
           FROM player_time pt
         UNION ALL
         SELECT ptr.player_uuid, ptr.player_name, ptr.login_time
           FROM player_time_record ptr
       ) merged
      GROUP BY player_uuid`,
  );
}

async function fetchPlayerSignIn(): Promise<RowDataPacket[]> {
  // 签到表只提供来源与名称；签到时间不参与最近活跃计算
  return query<RowDataPacket[]>(
    `SELECT player_uuid AS uuid, MAX(player_name) AS name
       FROM player_sign_in
      GROUP BY player_uuid`,
  );
}

async function fetchAuthme(): Promise<RowDataPacket[]> {
  // lastlogin/regdate 自适应秒/毫秒；不查询 password/totp
  return query<RowDataPacket[]>(
    `SELECT username,
            MAX(realname) AS realname,
            MAX(CASE WHEN regdate IS NULL OR regdate = 0 THEN NULL
                 WHEN regdate > 1000000000000 THEN FROM_UNIXTIME(regdate / 1000)
                 ELSE FROM_UNIXTIME(regdate) END) AS registeredAt,
            MAX(CASE WHEN lastlogin IS NULL OR lastlogin = 0 THEN NULL
                 WHEN lastlogin > 1000000000000 THEN FROM_UNIXTIME(lastlogin / 1000)
                 ELSE FROM_UNIXTIME(lastlogin) END) AS lastActiveAt
       FROM authme
      GROUP BY username`,
  );
}

async function fetchCompanions(): Promise<RowDataPacket[]> {
  // 小精灵表没有时间列，不参与最近活跃计算，只提供来源与名称
  return query<RowDataPacket[]>(
    `SELECT player_uuid AS uuid, MAX(player_name) AS name
       FROM companions_owned
      GROUP BY player_uuid`,
  );
}

async function fetchPlayerTitle(): Promise<RowDataPacket[]> {
  // 称号表没有活跃时间列，只提供来源与名称
  return query<RowDataPacket[]>(
    `SELECT player_uuid AS uuid, MAX(player_name) AS name
       FROM title_player
      WHERE player_uuid IS NOT NULL
      GROUP BY player_uuid`,
  );
}

async function fetchPlayerTask(): Promise<RowDataPacket[]> {
  // 任务币表只提供来源与名称；登录时间不参与最近活跃计算
  return query<RowDataPacket[]>(
    `SELECT player_uuid AS uuid, MAX(player_name) AS name
       FROM task_coin
      WHERE player_uuid IS NOT NULL
      GROUP BY player_uuid`,
  );
}

async function fetchPlayerWarp(): Promise<RowDataPacket[]> {
  // 地标表只提供来源与名称；创建时间不参与最近活跃计算
  return query<RowDataPacket[]>(
    `SELECT player_uuid AS uuid, MAX(player_name) AS name
       FROM warp_player
      WHERE player_uuid IS NOT NULL
      GROUP BY player_uuid`,
  );
}

async function fetchPlayerCurrency(): Promise<RowDataPacket[]> {
  // 货币表只提供来源与名称；流水时间不参与最近活跃计算
  return query<RowDataPacket[]>(
    `SELECT player_uuid AS uuid, MAX(player_name) AS name
       FROM player_currency
      WHERE player_uuid IS NOT NULL
      GROUP BY player_uuid`,
  );
}

async function fetchPlayerIntensify(): Promise<RowDataPacket[]> {
  // 强化表没有时间列，只提供来源与名称
  return query<RowDataPacket[]>(
    `SELECT player_uuid AS uuid, MAX(player_name) AS name
       FROM player_intensify
      WHERE player_uuid IS NOT NULL
      GROUP BY player_uuid`,
  );
}

async function fetchGuildPlayer(): Promise<RowDataPacket[]> {
  // 公会成员表只提供来源与名称；上线时间不参与最近活跃计算
  return query<RowDataPacket[]>(
    `SELECT player_uuid AS uuid, MAX(player_name) AS name
       FROM guild_player
      WHERE player_uuid IS NOT NULL
      GROUP BY player_uuid`,
  );
}

async function fetchMypet(): Promise<RowDataPacket[]> {
  // 玩家配置表提供内部 UUID 与名称；宠物表无时间列，不参与最近活跃计算
  return query<RowDataPacket[]>(
    `SELECT internal_uuid AS uuid, MAX(name) AS name
       FROM mypet_players
      WHERE name IS NOT NULL
      GROUP BY internal_uuid`,
  );
}

async function fetchLuckPerms(): Promise<RowDataPacket[]> {
  // 权限表提供 UUID 与（小写）用户名，只提供来源与名称；无活跃时间列
  return query<RowDataPacket[]>(
    `SELECT uuid, MAX(username) AS name
       FROM luckperms_players
      GROUP BY uuid`,
  );
}

/** 插件已启用则执行查询，否则返回空数组，便于并行取数后统一合并。 */
function fetchWhen(
  enabled: Set<string>,
  pluginId: string,
  fetch: () => Promise<RowDataPacket[]>,
): Promise<RowDataPacket[]> {
  return enabled.has(pluginId) ? fetch() : Promise.resolve([]);
}

/** 构建玩家目录（uuid → 档案；AuthMe 独有玩家以虚拟键挂载）。 */
export async function buildPlayerRegistry(): Promise<RegistryEntry[]> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.value;
  }
  const plugins = await getEnabledPlugins();
  const enabled = new Set(plugins.map((plugin) => plugin.id));

  // 各插件查询并行发出（连接池上限内自行调度），全部返回后再按序合并，
  // 冷缓存下目录构建耗时从 8 次串行 RTT 之和降为最慢一条查询的耗时
  const [
    playerTimeRows,
    signInRows,
    companionsRows,
    titleRows,
    taskRows,
    warpRows,
    currencyRows,
    intensifyRows,
    guildRows,
    mypetRows,
    luckPermsRows,
    authmeRows,
  ] = await Promise.all([
    fetchWhen(enabled, "playertime", fetchPlayerTime),
    fetchWhen(enabled, "playersignin", fetchPlayerSignIn),
    fetchWhen(enabled, "companions", fetchCompanions),
    fetchWhen(enabled, "playertitle", fetchPlayerTitle),
    fetchWhen(enabled, "playertask", fetchPlayerTask),
    fetchWhen(enabled, "playerwarp", fetchPlayerWarp),
    fetchWhen(enabled, "playercurrency", fetchPlayerCurrency),
    fetchWhen(enabled, "playerintensify", fetchPlayerIntensify),
    fetchWhen(enabled, "playerguild", fetchGuildPlayer),
    fetchWhen(enabled, "mypet", fetchMypet),
    fetchWhen(enabled, "luckperms", fetchLuckPerms),
    fetchWhen(enabled, "authme", fetchAuthme),
  ]);

  // name → uuid 桥接表（来自有 UUID 的各插件）
  const nameToUuid = new Map<string, string>();
  const byUuid = new Map<string, RegistryEntry>();

  if (enabled.has("playertime")) {
    for (const row of playerTimeRows) {
      const uuid = String(row.uuid);
      const name = String(row.name);
      nameToUuid.set(normalizeName(name), uuid);
      byUuid.set(uuid, {
        key: uuid,
        uuid,
        name,
        registeredAt: null,
        sources: ["playertime"],
        lastActiveAt: row.lastActiveAt
          ? formatDateTime(String(row.lastActiveAt))
          : null,
      });
    }
  }

  if (enabled.has("playersignin")) {
    for (const row of signInRows) {
      const uuid = String(row.uuid);
      const name = String(row.name);
      nameToUuid.set(normalizeName(name), uuid);
      const existing = byUuid.get(uuid);
      if (existing) {
        existing.sources.push("playersignin");
      } else {
        byUuid.set(uuid, {
          key: uuid,
          uuid,
          name,
          registeredAt: null,
          sources: ["playersignin"],
          lastActiveAt: null,
        });
      }
    }
  }

  if (enabled.has("companions")) {
    for (const row of companionsRows) {
      const uuid = String(row.uuid);
      const name = row.name ? String(row.name) : uuid.slice(0, 8);
      nameToUuid.set(normalizeName(name), uuid);
      const existing = byUuid.get(uuid);
      if (existing) {
        existing.sources.push("companions");
      } else {
        byUuid.set(uuid, {
          key: uuid,
          uuid,
          name,
          registeredAt: null,
          sources: ["companions"],
          lastActiveAt: null,
        });
      }
    }
  }

  if (enabled.has("playertitle")) {
    for (const row of titleRows) {
      const uuid = String(row.uuid);
      const name = row.name ? String(row.name) : uuid.slice(0, 8);
      nameToUuid.set(normalizeName(name), uuid);
      const existing = byUuid.get(uuid);
      if (existing) {
        existing.sources.push("playertitle");
      } else {
        byUuid.set(uuid, {
          key: uuid,
          uuid,
          name,
          registeredAt: null,
          sources: ["playertitle"],
          lastActiveAt: null,
        });
      }
    }
  }

  if (enabled.has("playertask")) {
    for (const row of taskRows) {
      const uuid = String(row.uuid);
      const name = row.name ? String(row.name) : uuid.slice(0, 8);
      nameToUuid.set(normalizeName(name), uuid);
      const existing = byUuid.get(uuid);
      if (existing) {
        existing.sources.push("playertask");
      } else {
        byUuid.set(uuid, {
          key: uuid,
          uuid,
          name,
          registeredAt: null,
          sources: ["playertask"],
          lastActiveAt: null,
        });
      }
    }
  }

  if (enabled.has("playerwarp")) {
    for (const row of warpRows) {
      const uuid = String(row.uuid);
      const name = row.name ? String(row.name) : uuid.slice(0, 8);
      nameToUuid.set(normalizeName(name), uuid);
      const existing = byUuid.get(uuid);
      if (existing) {
        existing.sources.push("playerwarp");
      } else {
        byUuid.set(uuid, {
          key: uuid,
          uuid,
          name,
          registeredAt: null,
          sources: ["playerwarp"],
          lastActiveAt: null,
        });
      }
    }
  }

  if (enabled.has("playercurrency")) {
    for (const row of currencyRows) {
      const uuid = String(row.uuid);
      const name = row.name ? String(row.name) : uuid.slice(0, 8);
      nameToUuid.set(normalizeName(name), uuid);
      const existing = byUuid.get(uuid);
      if (existing) {
        existing.sources.push("playercurrency");
      } else {
        byUuid.set(uuid, {
          key: uuid,
          uuid,
          name,
          registeredAt: null,
          sources: ["playercurrency"],
          lastActiveAt: null,
        });
      }
    }
  }

  if (enabled.has("playerintensify")) {
    for (const row of intensifyRows) {
      const uuid = String(row.uuid);
      const name = row.name ? String(row.name) : uuid.slice(0, 8);
      nameToUuid.set(normalizeName(name), uuid);
      const existing = byUuid.get(uuid);
      if (existing) {
        existing.sources.push("playerintensify");
      } else {
        byUuid.set(uuid, {
          key: uuid,
          uuid,
          name,
          registeredAt: null,
          sources: ["playerintensify"],
          lastActiveAt: null,
        });
      }
    }
  }

  if (enabled.has("playerguild")) {
    for (const row of guildRows) {
      const uuid = String(row.uuid);
      const name = row.name ? String(row.name) : uuid.slice(0, 8);
      nameToUuid.set(normalizeName(name), uuid);
      const existing = byUuid.get(uuid);
      if (existing) {
        existing.sources.push("playerguild");
      } else {
        byUuid.set(uuid, {
          key: uuid,
          uuid,
          name,
          registeredAt: null,
          sources: ["playerguild"],
          lastActiveAt: null,
        });
      }
    }
  }

  if (enabled.has("mypet")) {
    for (const row of mypetRows) {
      const uuid = String(row.uuid);
      const name = row.name ? String(row.name) : uuid.slice(0, 8);
      nameToUuid.set(normalizeName(name), uuid);
      const existing = byUuid.get(uuid);
      if (existing) {
        existing.sources.push("mypet");
      } else {
        byUuid.set(uuid, {
          key: uuid,
          uuid,
          name,
          registeredAt: null,
          sources: ["mypet"],
          lastActiveAt: null,
        });
      }
    }
  }

  if (enabled.has("luckperms")) {
    for (const row of luckPermsRows) {
      const uuid = String(row.uuid);
      const name = row.name ? String(row.name) : uuid.slice(0, 8);
      nameToUuid.set(normalizeName(name), uuid);
      const existing = byUuid.get(uuid);
      if (existing) {
        existing.sources.push("luckperms");
      } else {
        byUuid.set(uuid, {
          key: uuid,
          uuid,
          name,
          registeredAt: null,
          sources: ["luckperms"],
          lastActiveAt: null,
        });
      }
    }
  }

  if (enabled.has("authme")) {
    for (const row of authmeRows) {
      const username = String(row.username);
      const realname = String(row.realname);
      const bridge = nameToUuid.get(normalizeName(realname));
      if (bridge) {
        const existing = byUuid.get(bridge);
        if (existing) {
          existing.sources.push("authme");
          existing.registeredAt = row.registeredAt
            ? formatDateTime(String(row.registeredAt))
            : null;
          existing.name = realname;
          // 最近活跃：PlayerTime 优先，AuthMe 仅在缺省时兜底
          if (row.lastActiveAt && !existing.lastActiveAt) {
            existing.lastActiveAt = formatDateTime(String(row.lastActiveAt));
          }
        }
      } else {
        // AuthMe 独有玩家：注册过但从未被其他插件记录
        byUuid.set(`name:${username}`, {
          key: `name:${username}`,
          uuid: null,
          name: realname,
          registeredAt: row.registeredAt
            ? formatDateTime(String(row.registeredAt))
            : null,
          sources: ["authme"],
          lastActiveAt: row.lastActiveAt
            ? formatDateTime(String(row.lastActiveAt))
            : null,
        });
      }
    }
  }

  const value = Array.from(byUuid.values()).sort((a, b) =>
    (b.lastActiveAt ?? "").localeCompare(a.lastActiveAt ?? ""),
  );
  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

/** 清空目录缓存（配置变更后调用）。 */
export function invalidatePlayerRegistry(): void {
  cache = null;
}
