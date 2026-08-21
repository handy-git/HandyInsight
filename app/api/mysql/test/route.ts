import { NextResponse } from "next/server";

import { mysqlConfigSchema } from "@/lib/common/schemas";
import { testConnection } from "@/lib/server/mysql";

/** 测试连接：不落盘，仅验证网络、账号、数据库与目标表。 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = mysqlConfigSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "连接信息不完整";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
  const result = await testConnection(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
