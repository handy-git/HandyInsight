import { NextResponse } from "next/server";

import { getTitlePlayers } from "@/lib/plugins/playertitle/queries";
import { titlePlayersQuerySchema } from "@/lib/plugins/playertitle/schemas";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("playertitle", async () => {
    const { keyword, page, sort, order } = titlePlayersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getTitlePlayers(keyword, page, sort, order));
  });
}
