import { NextResponse } from "next/server";

import { getTitlePlayers } from "@/lib/plugins/playertitle/queries";
import { titlePlayersQuerySchema } from "@/lib/plugins/playertitle/schemas";
import { apiError, searchParamsObject } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(request: Request) {
  try {
    await requirePlugin("playertitle");
    const { keyword, page } = titlePlayersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getTitlePlayers(keyword, page));
  } catch (error) {
    return apiError(error);
  }
}
