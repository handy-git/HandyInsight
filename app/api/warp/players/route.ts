import { NextResponse } from "next/server";

import {
  getWarpPlayers,
  warpPlayersQuerySchema,
} from "@/lib/plugins/playerwarp/queries";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("playerwarp", async () => {
    const { keyword, page, sort, order } = warpPlayersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getWarpPlayers(keyword, page, sort, order));
  });
}
