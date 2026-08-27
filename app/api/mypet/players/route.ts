import { NextResponse } from "next/server";

import {
  getMypetPlayers,
  mypetPlayersQuerySchema,
} from "@/lib/plugins/mypet/queries";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("mypet", async () => {
    const { keyword, page, sort, order } = mypetPlayersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getMypetPlayers(keyword, page, sort, order));
  });
}
