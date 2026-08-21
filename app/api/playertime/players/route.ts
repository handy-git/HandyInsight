import { NextResponse } from "next/server";

import { getPlayers } from "@/lib/plugins/playertime/queries";
import { playersQuerySchema } from "@/lib/plugins/playertime/schemas";
import { apiError, searchParamsObject } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(request: Request) {
  try {
    await requirePlugin("playertime");
    const { keyword, page } = playersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getPlayers(keyword, page));
  } catch (error) {
    return apiError(error);
  }
}
