import { NextResponse } from "next/server";

import { getTrend } from "@/lib/playertime/queries";
import { trendRangeSchema } from "@/lib/schemas/playertime";
import { apiError, searchParamsObject } from "@/lib/server/api";

export async function GET(request: Request) {
  try {
    const range = trendRangeSchema.parse(searchParamsObject(request).range);
    return NextResponse.json(await getTrend(range));
  } catch (error) {
    return apiError(error);
  }
}
