import { NextResponse } from "next/server";

import { getRanking } from "@/lib/plugins/playertime/queries";
import { rankingQuerySchema } from "@/lib/plugins/playertime/schemas";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("playertime", async () => {
    const { scope, page } = rankingQuerySchema.parse(searchParamsObject(request));
    return NextResponse.json(await getRanking(scope, page));
  });
}
