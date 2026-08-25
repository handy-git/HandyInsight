import { NextResponse } from "next/server";

import { getPlayers } from "@/lib/plugins/playertime/queries";
import { playersQuerySchema } from "@/lib/plugins/playertime/schemas";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("playertime", async () => {
    const { keyword, page, sort, order } = playersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getPlayers(keyword, page, sort, order));
  });
}
