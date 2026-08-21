import { NextResponse } from "next/server";

import { getPlayerSessions } from "@/lib/plugins/playertime/queries";
import { pageQuerySchema, uuidSchema } from "@/lib/plugins/playertime/schemas";
import { apiError, searchParamsObject } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    await requirePlugin("playertime");
    const uuid = uuidSchema.parse((await params).uuid);
    const { page, pageSize } = pageQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getPlayerSessions(uuid, page, pageSize));
  } catch (error) {
    return apiError(error);
  }
}
