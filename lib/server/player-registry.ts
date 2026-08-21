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
  /** 各插件记录的最后活跃时间（取最大值为整体最近活跃） */
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
  return query<RowDataPacket[]>(
    `SELECT player_uuid AS uuid, MAX(player_name) AS name,
            MAX(sign_in_date) AS lastActiveAt
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
  // 宠物表没有时间列，不参与最近活跃计算，只提供来源与名称
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

/** 构建玩家目录（uuid → 档案；AuthMe 独有玩家以虚拟键挂载）。 */
export async function buildPlayerRegistry(): Promise<RegistryEntry[]> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.value;
  }
  const plugins = await getEnabledPlugins();
  const enabled = new Set(plugins.map((plugin) => plugin.id));

  // name → uuid 桥接表（来自有 UUID 的各插件）
  const nameToUuid = new Map<string, string>();
  const byUuid = new Map<string, RegistryEntry>();

  if (enabled.has("playertime")) {
    for (const row of await fetchPlayerTime()) {
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
    for (const row of await fetchPlayerSignIn()) {
      const uuid = String(row.uuid);
      const name = String(row.name);
      nameToUuid.set(normalizeName(name), uuid);
      const existing = byUuid.get(uuid);
      if (existing) {
        existing.sources.push("playersignin");
        if (
          row.lastActiveAt &&
          (!existing.lastActiveAt ||
            formatDateTime(String(row.lastActiveAt)) > existing.lastActiveAt)
        ) {
          existing.lastActiveAt = formatDateTime(String(row.lastActiveAt));
        }
      } else {
        byUuid.set(uuid, {
          key: uuid,
          uuid,
          name,
          registeredAt: null,
          sources: ["playersignin"],
          lastActiveAt: row.lastActiveAt
            ? formatDateTime(String(row.lastActiveAt))
            : null,
        });
      }
    }
  }

  if (enabled.has("companions")) {
    for (const row of await fetchCompanions()) {
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
    for (const row of await fetchPlayerTitle()) {
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

  if (enabled.has("authme")) {
    for (const row of await fetchAuthme()) {
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
          if (
            row.lastActiveAt &&
            (!existing.lastActiveAt ||
              formatDateTime(String(row.lastActiveAt)) > existing.lastActiveAt)
          ) {
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
