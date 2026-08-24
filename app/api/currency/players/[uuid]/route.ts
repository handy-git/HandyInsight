import { NextResponse } from "next/server";

import {
  currencyUuidSchema,
  getCurrencyPlayerDetail,
} from "@/lib/plugins/playercurrency/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  return withPlugin("playercurrency", async () => {
    const { uuid } = await params;
    const parsed = currencyUuidSchema.parse(uuid);
    const detail = await getCurrencyPlayerDetail(parsed);
    if (!detail) {
      return NextResponse.json(
        { message: "未找到该玩家的货币数据" },
        { status: 404 },
      );
    }
    return NextResponse.json(detail);
  });
}
