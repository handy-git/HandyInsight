import mysql from "mysql2/promise";

import { REQUIRED_TABLES, type MysqlConfig } from "@/lib/schemas/mysql";
import { loadMysqlConfig } from "@/lib/server/config";

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
    case "ER_BAD_DB_ERROR":
      return "数据库不存在，请检查数据库名";
    case "HANDSHAKE_NO_SSL_SUPPORT":
      return "目标 MySQL 不支持 SSL，请关闭 SSL 后重试";
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
    ssl: config.ssl ? {} : undefined,
    connectionLimit: 5,
    // 统一按 Asia/Shanghai 处理时间，日期以字符串传输避免时区歧义
    timezone: "+08:00",
    dateStrings: true,
    supportBigNumbers: true,
  };
}

interface PoolCache {
  pool: mysql.Pool | null;
}

const globalCache = globalThis as unknown as { __handyinsightPool?: PoolCache };
const cache: PoolCache = globalCache.__handyinsightPool ?? { pool: null };
globalCache.__handyinsightPool = cache;

/** 重建只读连接池（保存新配置后调用）。 */
export async function rebuildPool(): Promise<void> {
  if (cache.pool) {
    await cache.pool.end().catch(() => undefined);
    cache.pool = null;
  }
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

export type TestResult =
  | { ok: true }
  | { ok: false; message: string };

/** 使用临时连接验证网络、账号、数据库以及 PlayerTime 目标表。 */
export async function testConnection(config: MysqlConfig): Promise<TestResult> {
  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection(toPoolOptions(config));
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT TABLE_NAME AS tableName
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?, ?)`,
      [config.database, REQUIRED_TABLES[0], REQUIRED_TABLES[1]],
    );
    const found = new Set(rows.map((row) => String(row.tableName)));
    const missing = REQUIRED_TABLES.filter((table) => !found.has(table));
    if (missing.length > 0) {
      return {
        ok: false,
        message: `不是有效的 PlayerTime 数据库：缺少数据表 ${missing.join("、")}`,
      };
    }
    return { ok: true };
  } catch (error) {
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

export class MysqlNotConfiguredError extends Error {
  constructor() {
    super("MySQL 尚未配置");
    this.name = "MysqlNotConfiguredError";
  }
}
