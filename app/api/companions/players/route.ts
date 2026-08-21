import { NextResponse } from "next/server";

import {
  companionsPlayersQuerySchema,
  getCompanionsPlayers,
} from "@/lib/plugins/companions/queries";
import { apiError, searchParamsObject } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(request: Request) {
  try {
    await requirePlugin("companions");
    const { keyword, page } = companionsPlayersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getCompanionsPlayers(keyword, page));
  } catch (error) {
    return apiError(error);
  }
}
