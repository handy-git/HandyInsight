import { NextResponse } from "next/server";

import { getSignInTrend } from "@/lib/plugins/playersignin/queries";
import { signInTrendRangeSchema } from "@/lib/plugins/playersignin/schemas";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("playersignin", async () => {
    const range = signInTrendRangeSchema.parse(searchParamsObject(request).range);
    return NextResponse.json(await getSignInTrend(range));
  });
}
