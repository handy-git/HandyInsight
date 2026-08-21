import { NextResponse } from "next/server";

import { loadMysqlConfig } from "@/lib/server/config";
import { pingSavedConnection } from "@/lib/server/mysql";

/** 配置状态：只返回非敏感信息，绝不回传密码与完整地址。 */
export async function GET() {
  const config = await loadMysqlConfig();
  if (!config) {
    return NextResponse.json({ configured: false, connected: false });
  }
  const connected = await pingSavedConnection();
  return NextResponse.json({
    configured: true,
    connected,
    database: config.database,
  });
}
