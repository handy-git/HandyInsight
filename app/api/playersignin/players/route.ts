import { NextResponse } from "next/server";

import { getSignInPlayers } from "@/lib/plugins/playersignin/queries";
import { signInPlayersQuerySchema } from "@/lib/plugins/playersignin/schemas";
import { apiError, searchParamsObject } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(request: Request) {
  try {
    await requirePlugin("playersignin");
    const { keyword, page } = signInPlayersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getSignInPlayers(keyword, page));
  } catch (error) {
    return apiError(error);
  }
}
