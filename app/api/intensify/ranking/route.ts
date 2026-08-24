import { NextResponse } from "next/server";

import { getIntensifyRanking } from "@/lib/plugins/playerintensify/queries";
import { intensifyRankingTypeSchema } from "@/lib/plugins/playerintensify/schemas";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("playerintensify", async () => {
    const type = intensifyRankingTypeSchema.parse(
      searchParamsObject(request).type,
    );
    return NextResponse.json(await getIntensifyRanking(type));
  });
}
