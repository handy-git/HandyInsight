import { NextResponse } from "next/server";

import { mysqlConfigSchema } from "@/lib/schemas/mysql";
import { saveMysqlConfig } from "@/lib/server/config";
import { rebuildPool, testConnection } from "@/lib/server/mysql";

/** 保存配置：保存前必须再次通过连接测试，然后重建只读连接池。 */
export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = mysqlConfigSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "连接信息不完整";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
  const result = await testConnection(parsed.data);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  await saveMysqlConfig(parsed.data);
  await rebuildPool();
  return NextResponse.json({ ok: true });
}
