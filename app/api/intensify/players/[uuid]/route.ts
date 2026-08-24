import { NextResponse } from "next/server";

import { getIntensifyPlayerDetail } from "@/lib/plugins/playerintensify/queries";
import { intensifyUuidSchema } from "@/lib/plugins/playerintensify/schemas";
import { withPlugin } from "@/lib/server/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  return withPlugin("playerintensify", async () => {
    const uuid = intensifyUuidSchema.parse((await params).uuid);
    const detail = await getIntensifyPlayerDetail(uuid);
    if (!detail) {
      return NextResponse.json(
        { ok: false, message: "未找到该玩家的强化记录" },
        { status: 404 },
      );
    }
    return NextResponse.json(detail);
  });
}
