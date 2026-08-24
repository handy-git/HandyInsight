import { NextResponse } from "next/server";

import {
  currencyPlayersQuerySchema,
  getCurrencyPlayers,
} from "@/lib/plugins/playercurrency/queries";
import { apiError, searchParamsObject } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(request: Request) {
  try {
    await requirePlugin("playercurrency");
    const { keyword, page } = currencyPlayersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getCurrencyPlayers(keyword, page));
  } catch (error) {
    return apiError(error);
  }
}
