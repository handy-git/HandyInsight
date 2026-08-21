import { NextResponse } from "next/server";

import { loadMysqlConfig } from "@/lib/server/config";
import { getEnabledPlugins, pingSavedConnection } from "@/lib/server/mysql";

/** 配置状态：只返回非敏感信息（是否已配置、连接可用性、启用插件），绝不回传密码。 */
export async function GET() {
  const config = await loadMysqlConfig();
  if (!config) {
    return NextResponse.json({
      configured: false,
      connected: false,
      plugins: [],
    });
  }
  const connected = await pingSavedConnection();
  const plugins = connected ? await getEnabledPlugins() : [];
  return NextResponse.json({
    configured: true,
    connected,
    database: config.database,
    plugins: plugins.map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      landing: plugin.landing,
    })),
  });
}
