import { NextResponse } from "next/server";

import { getAuthmeTrend } from "@/lib/plugins/authme/queries";
import { authmeTrendRangeSchema } from "@/lib/plugins/authme/schemas";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("authme", async () => {
    const range = authmeTrendRangeSchema.parse(
      searchParamsObject(request).range,
    );
    return NextResponse.json(await getAuthmeTrend(range));
  });
}
