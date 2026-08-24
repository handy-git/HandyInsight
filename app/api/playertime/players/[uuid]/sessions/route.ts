import { NextResponse } from "next/server";

import { getPlayerSessions } from "@/lib/plugins/playertime/queries";
import { pageQuerySchema, uuidSchema } from "@/lib/plugins/playertime/schemas";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  return withPlugin("playertime", async () => {
    const uuid = uuidSchema.parse((await params).uuid);
    const { page, pageSize } = pageQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getPlayerSessions(uuid, page, pageSize));
  });
}
