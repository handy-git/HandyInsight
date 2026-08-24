import { NextResponse } from "next/server";

import {
  getWarpPlayers,
  warpPlayersQuerySchema,
} from "@/lib/plugins/playerwarp/queries";
import { apiError, searchParamsObject } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(request: Request) {
  try {
    await requirePlugin("playerwarp");
    const { keyword, page } = warpPlayersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getWarpPlayers(keyword, page));
  } catch (error) {
    return apiError(error);
  }
}
