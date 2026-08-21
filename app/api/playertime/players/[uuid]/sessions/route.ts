import { NextResponse } from "next/server";

import { getPlayerSessions } from "@/lib/playertime/queries";
import { pageQuerySchema, uuidSchema } from "@/lib/schemas/playertime";
import { apiError, searchParamsObject } from "@/lib/server/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const uuid = uuidSchema.parse((await params).uuid);
    const { page } = pageQuerySchema.parse(searchParamsObject(request));
    return NextResponse.json(await getPlayerSessions(uuid, page));
  } catch (error) {
    return apiError(error);
  }
}
