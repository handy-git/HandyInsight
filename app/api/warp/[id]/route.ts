import { NextResponse } from "next/server";

import {
  getWarpDetail,
  warpIdSchema,
} from "@/lib/plugins/playerwarp/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withPlugin("playerwarp", async () => {
    const { id } = await params;
    const parsed = warpIdSchema.parse(id);
    const detail = await getWarpDetail(parsed);
    if (!detail) {
      return NextResponse.json({ message: "未找到该地标" }, { status: 404 });
    }
    return NextResponse.json(detail);
  });
}
