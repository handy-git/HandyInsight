import { NextResponse } from "next/server";

import {
  currencyPlayersQuerySchema,
  getCurrencyPlayers,
} from "@/lib/plugins/playercurrency/queries";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("playercurrency", async () => {
    const { keyword, page, sort, order } = currencyPlayersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(
      await getCurrencyPlayers(keyword, page, sort, order),
    );
  });
}
