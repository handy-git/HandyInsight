import { promises as fs } from "node:fs";
import path from "node:path";

import { mysqlConfigSchema, type MysqlConfig } from "@/lib/common/schemas";

const CONFIG_DIR = path.join(process.cwd(), ".data");
const CONFIG_FILE = path.join(CONFIG_DIR, "mysql.json");

const MYSQL_ENV_KEYS = [
  "MYSQL_HOST",
  "MYSQL_PORT",
  "MYSQL_DATABASE",
  "MYSQL_USER",
  "MYSQL_PASSWORD",
] as const;

function loadEnvMysqlConfig(): MysqlConfig | null | undefined {
  if (!MYSQL_ENV_KEYS.some((key) => process.env[key] !== undefined)) {
    return undefined;
  }

  const parsed = mysqlConfigSchema.safeParse({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD ?? "",
    ssl: false,
  });
  return parsed.success ? parsed.data : null;
}

export async function loadMysqlConfig(): Promise<MysqlConfig | null> {
  const envConfig = loadEnvMysqlConfig();
  if (envConfig !== undefined) {
    return envConfig;
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
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
}
