import { NextResponse } from "next/server";

import {
  getGuildMembers,
  guildIdSchema,
  guildMemberQuerySchema,
} from "@/lib/plugins/playerguild/queries";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withPlugin("playerguild", async () => {
    const { id } = await params;
    const guildId = guildIdSchema.parse(id);
    const input = guildMemberQuerySchema.parse(searchParamsObject(request));
    return NextResponse.json(
      await getGuildMembers(
        guildId,
        input.keyword,
        input.page,
        input.sort,
        input.order,
      ),
    );
  });
}
