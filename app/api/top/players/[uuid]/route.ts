import { NextResponse } from "next/server";

import {
  getTopPlayerDetail,
  topUuidSchema,
} from "@/lib/plugins/playertop/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  return withPlugin("playertop", async () => {
    const { uuid } = await params;
    const parsed = topUuidSchema.parse(uuid);
    const detail = await getTopPlayerDetail(parsed);
    if (!detail) {
      return NextResponse.json(
        { message: "未找到该玩家的排行数据" },
        { status: 404 },
      );
    }
    return NextResponse.json(detail);
  });
}
