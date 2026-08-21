import { NextResponse } from "next/server";

import { getUnifiedPlayerTimeline } from "@/lib/server/unified-players";
import { apiError } from "@/lib/server/api";
import { getPool } from "@/lib/server/mysql";

const KEY_PATTERN = /^(name:)?[A-Za-z0-9_-]{1,64}$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    if (!(await getPool())) {
      return NextResponse.json(
        { ok: false, message: "MySQL 尚未配置，请先完成连接配置" },
        { status: 409 },
      );
    }
    const key = decodeURIComponent((await params).key);
    if (!KEY_PATTERN.test(key)) {
      return NextResponse.json(
        { ok: false, message: "玩家标识不合法" },
        { status: 400 },
      );
    }
    return NextResponse.json(await getUnifiedPlayerTimeline(key));
  } catch (error) {
    return apiError(error);
  }
}
