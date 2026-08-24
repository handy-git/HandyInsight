import { NextResponse } from "next/server";

import {
  getTaskPlayerDetail,
  taskUuidSchema,
} from "@/lib/plugins/playertask/queries";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    await requirePlugin("playertask");
    const { uuid } = await params;
    const detail = await getTaskPlayerDetail(taskUuidSchema.parse(uuid));
    return NextResponse.json(detail ?? { ok: false, message: "未找到该玩家" });
  } catch (error) {
    return apiError(error);
  }
}
