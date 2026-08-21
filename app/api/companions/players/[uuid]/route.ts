import { NextResponse } from "next/server";

import {
  companionsUuidSchema,
  getCompanionsPlayerDetail,
} from "@/lib/plugins/companions/queries";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    await requirePlugin("companions");
    const uuid = companionsUuidSchema.parse((await params).uuid);
    const detail = await getCompanionsPlayerDetail(uuid);
    if (!detail) {
      return NextResponse.json(
        { ok: false, message: "未找到该玩家的宠物数据" },
        { status: 404 },
      );
    }
    return NextResponse.json(detail);
  } catch (error) {
    return apiError(error);
  }
}
