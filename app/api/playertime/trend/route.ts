import { NextResponse } from "next/server";

import { getTrend } from "@/lib/plugins/playertime/queries";
import { trendRangeSchema } from "@/lib/plugins/playertime/schemas";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("playertime", async () => {
    const range = trendRangeSchema.parse(searchParamsObject(request).range);
    return NextResponse.json(await getTrend(range));
  });
}
