import { promises as fs } from "node:fs";
import path from "node:path";

import { mysqlConfigSchema, type MysqlConfig } from "@/lib/schemas/mysql";

const CONFIG_DIR = path.join(process.cwd(), ".data");
const CONFIG_FILE = path.join(CONFIG_DIR, "mysql.json");

export async function loadMysqlConfig(): Promise<MysqlConfig | null> {
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
