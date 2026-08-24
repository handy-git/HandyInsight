import { NextResponse } from "next/server";

import {
  getTaskPlayerDetail,
  taskUuidSchema,
} from "@/lib/plugins/playertask/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  return withPlugin("playertask", async () => {
    const { uuid } = await params;
    const detail = await getTaskPlayerDetail(taskUuidSchema.parse(uuid));
    return NextResponse.json(detail ?? { ok: false, message: "未找到该玩家" });
  });
}
