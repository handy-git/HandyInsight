import { NextResponse } from "next/server";

import { getSignInTrend } from "@/lib/plugins/playersignin/queries";
import { signInTrendRangeSchema } from "@/lib/plugins/playersignin/schemas";
import { apiError, searchParamsObject } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(request: Request) {
  try {
    await requirePlugin("playersignin");
    const range = signInTrendRangeSchema.parse(searchParamsObject(request).range);
    return NextResponse.json(await getSignInTrend(range));
  } catch (error) {
    return apiError(error);
  }
}
