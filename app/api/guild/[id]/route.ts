import { NextResponse } from "next/server";

import {
  getGuildDetail,
  guildIdSchema,
} from "@/lib/plugins/playerguild/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withPlugin("playerguild", async () => {
    const { id } = await params;
    const guildId = guildIdSchema.parse(id);
    const detail = await getGuildDetail(guildId);
    if (!detail) {
      return NextResponse.json({ message: "未找到该公会" }, { status: 404 });
    }
    return NextResponse.json(detail);
  });
}
