import { NextResponse } from "next/server";

import { getTrend } from "@/lib/plugins/playertime/queries";
import { trendRangeSchema } from "@/lib/plugins/playertime/schemas";
import { apiError, searchParamsObject } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(request: Request) {
  try {
    await requirePlugin("playertime");
    const range = trendRangeSchema.parse(searchParamsObject(request).range);
    return NextResponse.json(await getTrend(range));
  } catch (error) {
    return apiError(error);
  }
}
