import { NextResponse } from "next/server";

import {
  getWarpDetail,
  warpIdSchema,
} from "@/lib/plugins/playerwarp/queries";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePlugin("playerwarp");
    const { id } = await params;
    const parsed = warpIdSchema.parse(id);
    const detail = await getWarpDetail(parsed);
    if (!detail) {
      return NextResponse.json({ message: "未找到该地标" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    return apiError(error);
  }
}
