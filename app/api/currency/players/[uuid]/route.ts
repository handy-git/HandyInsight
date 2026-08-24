import { NextResponse } from "next/server";

import {
  currencyUuidSchema,
  getCurrencyPlayerDetail,
} from "@/lib/plugins/playercurrency/queries";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    await requirePlugin("playercurrency");
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
  } catch (error) {
    return apiError(error);
  }
}
