import { promises as fs } from "node:fs";
import path from "node:path";

import { mysqlConfigSchema, type MysqlConfig } from "@/lib/common/schemas";
import {
  getRuntimeEnv,
  isEdgeOneRuntime,
  type ServerEnv,
} from "@/lib/server/runtime-env";

const CONFIG_DIR = path.join(process.cwd(), ".data");
const CONFIG_FILE = path.join(CONFIG_DIR, "mysql.json");

const MYSQL_ENV_KEYS = [
  "MYSQL_HOST",
  "MYSQL_PORT",
  "MYSQL_DATABASE",
  "MYSQL_USER",
  "MYSQL_PASSWORD",
  "MYSQL_SSL",
  "MYSQL_SSL_VERIFY",
] as const;

function hasEnvMysqlConfig(env: ServerEnv): boolean {
  return MYSQL_ENV_KEYS.some((key) => env[key] !== undefined);
}

function envBoolean(
  value: string | undefined,
  fallback: boolean,
): boolean | string {
  if (value === undefined) return fallback;
  if (value === "1" || value.toLowerCase() === "true") return true;
  if (value === "0" || value.toLowerCase() === "false") return false;
  return value;
}

function loadEnvMysqlConfig(
  env: ServerEnv,
): MysqlConfig | null | undefined {
  if (!hasEnvMysqlConfig(env)) {
    return undefined;
  }

  const parsed = mysqlConfigSchema.safeParse({
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    database: env.MYSQL_DATABASE,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD ?? "",
    ssl: envBoolean(env.MYSQL_SSL, false),
    sslVerify: envBoolean(env.MYSQL_SSL_VERIFY, true),
  });
  return parsed.success ? parsed.data : null;
}

/** 页面是否可以持久化 MySQL 配置；环境变量与 EdgeOne 运行时均为只读。 */
export function isMysqlConfigEditable(): boolean {
  return !isEdgeOneRuntime() && !hasEnvMysqlConfig(getRuntimeEnv());
}

export async function loadMysqlConfig(): Promise<MysqlConfig | null> {
  const envConfig = loadEnvMysqlConfig(getRuntimeEnv());
  if (envConfig !== undefined) {
    return envConfig;
  }
  if (isEdgeOneRuntime()) {
    return null;
  }

  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf-8");
    const parsed = mysqlConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function saveMysqlConfig(config: MysqlConfig): Promise<void> {
  if (!isMysqlConfigEditable()) {
    throw new Error("当前运行环境不允许写入 MySQL 配置文件");
  }
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
}
