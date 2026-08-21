import { NextResponse } from "next/server";

import { getSignInPlayerDetail } from "@/lib/plugins/playersignin/queries";
import { signInUuidSchema } from "@/lib/plugins/playersignin/schemas";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    await requirePlugin("playersignin");
    const uuid = signInUuidSchema.parse((await params).uuid);
    const detail = await getSignInPlayerDetail(uuid);
    if (!detail) {
      return NextResponse.json(
        { ok: false, message: "未找到该玩家的签到记录" },
        { status: 404 },
      );
    }
    return NextResponse.json(detail);
  } catch (error) {
    return apiError(error);
  }
}
