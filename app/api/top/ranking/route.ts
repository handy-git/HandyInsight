import { NextResponse } from "next/server";

import {
  getTopRanking,
  topRankingQuerySchema,
} from "@/lib/plugins/playertop/queries";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("playertop", async () => {
    const { papi, page } = topRankingQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getTopRanking(papi, page));
  });
}
