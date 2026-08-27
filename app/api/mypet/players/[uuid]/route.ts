import { NextResponse } from "next/server";

import {
  getMypetPlayerDetail,
  mypetUuidSchema,
} from "@/lib/plugins/mypet/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  return withPlugin("mypet", async () => {
    const uuid = mypetUuidSchema.parse((await params).uuid);
    const detail = await getMypetPlayerDetail(uuid);
    if (!detail) {
      return NextResponse.json(
        { ok: false, message: "未找到该玩家的宠物数据" },
        { status: 404 },
      );
    }
    return NextResponse.json(detail);
  });
}
