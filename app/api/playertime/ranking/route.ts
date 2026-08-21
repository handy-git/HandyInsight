import { NextResponse } from "next/server";

import { getRanking } from "@/lib/plugins/playertime/queries";
import { rankingQuerySchema } from "@/lib/plugins/playertime/schemas";
import { apiError, searchParamsObject } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(request: Request) {
  try {
    await requirePlugin("playertime");
    const { scope, page } = rankingQuerySchema.parse(searchParamsObject(request));
    return NextResponse.json(await getRanking(scope, page));
  } catch (error) {
    return apiError(error);
  }
}
