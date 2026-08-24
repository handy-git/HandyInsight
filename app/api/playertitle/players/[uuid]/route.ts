import { NextResponse } from "next/server";

import { getTitlePlayerDetail } from "@/lib/plugins/playertitle/queries";
import { titleUuidSchema } from "@/lib/plugins/playertitle/schemas";
import { withPlugin } from "@/lib/server/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  return withPlugin("playertitle", async () => {
    const uuid = titleUuidSchema.parse((await params).uuid);
    const detail = await getTitlePlayerDetail(uuid);
    if (!detail) {
      return NextResponse.json(
        { ok: false, message: "未找到该玩家的称号数据" },
        { status: 404 },
      );
    }
    return NextResponse.json(detail);
  });
}
