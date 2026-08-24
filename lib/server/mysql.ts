import mysql from "mysql2/promise";

import type { PluginMeta } from "@/lib/common/plugins";
import { type MysqlConfig } from "@/lib/common/schemas";
import { loadMysqlConfig } from "@/lib/server/config";
import { invalidateQueryCache } from "@/lib/server/cache";
import { detectEnabledPlugins } from "@/lib/server/plugins";

/** 友好化常见连接错误，接口只返回该信息，不泄露 SQL 与地址细节。 */
export function friendlyMysqlError(error: unknown): string {
  const code = (error as NodeJS.ErrnoException & { code?: string })?.code;
  switch (code) {
    case "ECONNREFUSED":
      return "无法连接到 MySQL 服务器，请检查主机地址、端口以及 MySQL 是否已启动";
    case "ETIMEDOUT":
    case "ETIMEOUT":
      return "连接 MySQL 超时，请检查网络与防火墙设置";
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return "无法解析主机地址，请检查主机名是否正确";
    case "ER_ACCESS_DENIED_ERROR":
      return "用户名或密码错误，或该账号没有访问目标数据库的权限";
    case "ER_DBACCESS_DENIED_ERROR":
    case "ER_TABLEACCESS_DENIED_ERROR":
      return "账号没有访问目标数据库或插件数据表的权限";
    case "ER_BAD_DB_ERROR":
      return "数据库不存在，请检查数据库名";
    case "ER_SECURE_TRANSPORT_REQUIRED":
      return "目标 MySQL 要求 SSL/TLS 连接，请启用 SSL 后重试";
    case "HANDSHAKE_NO_SSL_SUPPORT":
      return "目标 MySQL 不支持 SSL，请关闭 SSL 后重试";
    case "HANDSHAKE_SSL_ERROR":
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
    case "SELF_SIGNED_CERT_IN_CHAIN":
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
      return "SSL 证书校验失败；自签名证书可关闭证书验证后重试";
    default:
      return "连接失败，请检查连接信息后重试";
  }
}

function toPoolOptions(config: MysqlConfig): mysql.PoolOptions {
  return {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl
      ? { rejectUnauthorized: config.sslVerify }
      : undefined,
    connectionLimit: 5,
    // 统一按 Asia/Shanghai 处理时间，日期以字符串传输避免时区歧义
    timezone: "+08:00",
    dateStrings: true,
    supportBigNumbers: true,
  };
}

interface ServerCache {
  pool: mysql.Pool | null;
  /** 已启用插件缓存，随连接池重建而失效 */
  enabledPlugins: PluginMeta[] | null;
}

const globalCache = globalThis as unknown as {
  __handyinsightServer?: ServerCache;
};
const cache: ServerCache = globalCache.__handyinsightServer ?? {
  pool: null,
  enabledPlugins: null,
};
globalCache.__handyinsightServer = cache;

/** 重建只读连接池（保存新配置后调用），同时失效插件探测与玩家目录缓存。 */
export async function rebuildPool(): Promise<void> {
  if (cache.pool) {
    await cache.pool.end().catch(() => undefined);
  }
  cache.pool = null;
  cache.enabledPlugins = null;
  // 连接目标可能已切换，清空全部插件查询缓存与玩家目录缓存
  invalidateQueryCache();
  const { invalidatePlayerRegistry } = await import(
    "@/lib/server/player-registry"
  );
  invalidatePlayerRegistry();
  const config = await loadMysqlConfig();
  if (config) {
    cache.pool = mysql.createPool(toPoolOptions(config));
  }
}

export async function getPool(): Promise<mysql.Pool | null> {
  if (!cache.pool) {
    await rebuildPool();
  }
  return cache.pool;
}

/** 已配置状态下检测连接是否可用。 */
export async function pingSavedConnection(): Promise<boolean> {
  const pool = await getPool();
  if (!pool) return false;
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

/**
 * 当前已启用的插件（按数据表探测）。
 * 未配置返回空数组；数据库不可达时按无可用插件处理。
 */
export async function getEnabledPlugins(): Promise<PluginMeta[]> {
  if (cache.enabledPlugins) {
    return cache.enabledPlugins;
  }
  const config = await loadMysqlConfig();
  const pool = await getPool();
  if (!config || !pool) {
    return [];
  }
  try {
    cache.enabledPlugins = await detectEnabledPlugins(
      config.database,
      async (sql, params) => {
        const [rows] = await pool.query<mysql.RowDataPacket[]>(sql, params);
        return rows;
      },
    );
  } catch {
    return [];
  }
  return cache.enabledPlugins;
}

export type TestResult =
  | { ok: true; plugins: PluginMeta[] }
  | { ok: false; message: string };

/**
 * 使用临时连接验证网络、账号、数据库，并按插件注册表探测可用模块。
 * 至少能启用一个插件才视为有效库。
 */
export async function testConnection(config: MysqlConfig): Promise<TestResult> {
  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection(toPoolOptions(config));
    const plugins = await detectEnabledPlugins(
      config.database,
      async (sql, params) => {
        const [rows] = await connection!.query<mysql.RowDataPacket[]>(
          sql,
          params,
        );
        return rows;
      },
    );
    if (plugins.length === 0) {
      return {
        ok: false,
        message:
          "不是有效的插件数据库：未找到任何受支持插件的数据表（如 player_time、player_sign_in）",
      };
    }
    return { ok: true, plugins };
  } catch (error) {
    const detail = error as NodeJS.ErrnoException & {
      errno?: number;
      sqlState?: string;
    };
    console.error("[mysql-test]", {
      code: detail.code,
      errno: detail.errno,
      sqlState: detail.sqlState,
      message: detail.message,
    });
    return { ok: false, message: friendlyMysqlError(error) };
  } finally {
    if (connection) {
      await connection.end().catch(() => undefined);
    }
  }
}

/** 统一查询入口；调用方必须保证 SQL 使用参数化占位符。 */
export async function query<T extends mysql.QueryResult>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const pool = await getPool();
  if (!pool) {
    throw new MysqlNotConfiguredError();
  }
  const [rows] = await pool.query<T>(sql, params);
  return rows;
}

/**
 * 标识符安全引号：仅放行字母 / 数字 / 下划线（表名、列名），
 * 其余字符一律拒绝，杜绝标识符位置拼接注入。
 */
export function escapeIdent(identifier: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(identifier)) {
    throw new Error("非法的 SQL 标识符");
  }
  return `\`${identifier}\``;
}

/** 校验插件是否已启用，未启用时抛出 PluginUnavailableError。 */
export async function requirePlugin(pluginId: string): Promise<void> {
  const pool = await getPool();
  if (!pool) {
    throw new MysqlNotConfiguredError();
  }
  const enabled = await getEnabledPlugins();
  if (!enabled.some((plugin) => plugin.id === pluginId)) {
    throw new PluginUnavailableError(pluginId);
  }
}

export class MysqlNotConfiguredError extends Error {
  constructor() {
    super("MySQL 尚未配置");
    this.name = "MysqlNotConfiguredError";
  }
}

export class PluginUnavailableError extends Error {
  constructor(public readonly pluginId: string) {
    super(`插件 ${pluginId} 未启用`);
    this.name = "PluginUnavailableError";
  }
}
