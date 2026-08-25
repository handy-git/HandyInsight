import { NextResponse } from "next/server";

import { getSignInPlayers } from "@/lib/plugins/playersignin/queries";
import { signInPlayersQuerySchema } from "@/lib/plugins/playersignin/schemas";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("playersignin", async () => {
    const { keyword, page, sort, order } = signInPlayersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(
      await getSignInPlayers(keyword, page, sort, order),
    );
  });
}
