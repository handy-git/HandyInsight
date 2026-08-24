import { NextResponse } from "next/server";

import { getPlayerDetail, getTrend } from "@/lib/plugins/playertime/queries";
import { uuidSchema } from "@/lib/plugins/playertime/schemas";
import { withPlugin } from "@/lib/server/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  return withPlugin("playertime", async () => {
    const uuid = uuidSchema.parse((await params).uuid);
    const detail = await getPlayerDetail(uuid);
    if (!detail) {
      return NextResponse.json(
        { ok: false, message: "未找到该玩家" },
        { status: 404 },
      );
    }
    const trend = await getTrend("30d", uuid);
    return NextResponse.json({ ...detail, trend });
  });
}
