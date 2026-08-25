import { NextResponse } from "next/server";

import { getIntensifyPlayers } from "@/lib/plugins/playerintensify/queries";
import { intensifyPlayersQuerySchema } from "@/lib/plugins/playerintensify/schemas";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("playerintensify", async () => {
    const { keyword, page, sort, order } = intensifyPlayersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getIntensifyPlayers(keyword, page, sort, order));
  });
}
