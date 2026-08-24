import { NextResponse } from "next/server";

import {
  getWarpPlayerDetail,
  warpUuidSchema,
} from "@/lib/plugins/playerwarp/queries";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    await requirePlugin("playerwarp");
    const { uuid } = await params;
    const parsed = warpUuidSchema.parse(uuid);
    const detail = await getWarpPlayerDetail(parsed);
    if (!detail) {
      return NextResponse.json({ message: "未找到该玩家的地标数据" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    return apiError(error);
  }
}
