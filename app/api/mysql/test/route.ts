import { NextResponse } from "next/server";

import { mysqlConfigSchema } from "@/lib/common/schemas";
import {
  isMysqlConfigEditable,
  loadMysqlConfig,
} from "@/lib/server/config";
import { testConnection } from "@/lib/server/mysql";

/** 测试连接：不落盘，仅验证网络、账号、数据库与目标表。 */
export async function POST(request: Request) {
  if (!isMysqlConfigEditable()) {
    const config = await loadMysqlConfig();
    if (!config) {
      return NextResponse.json(
        {
          ok: false,
          message: "请先在服务端环境变量中配置完整的 MySQL 连接信息",
        },
        { status: 409 },
      );
    }
    const result = await testConnection(config);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }
  const body = await request.json().catch(() => null);
  const parsed = mysqlConfigSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "连接信息不完整";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
  const result = await testConnection(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
