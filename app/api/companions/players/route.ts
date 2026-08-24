import { NextResponse } from "next/server";

import {
  companionsPlayersQuerySchema,
  getCompanionsPlayers,
} from "@/lib/plugins/companions/queries";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("companions", async () => {
    const { keyword, page } = companionsPlayersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getCompanionsPlayers(keyword, page));
  });
}
