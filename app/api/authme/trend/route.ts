import { NextResponse } from "next/server";

import { getAuthmeTrend } from "@/lib/plugins/authme/queries";
import { authmeTrendRangeSchema } from "@/lib/plugins/authme/schemas";
import { apiError, searchParamsObject } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(request: Request) {
  try {
    await requirePlugin("authme");
    const range = authmeTrendRangeSchema.parse(
      searchParamsObject(request).range,
    );
    return NextResponse.json(await getAuthmeTrend(range));
  } catch (error) {
    return apiError(error);
  }
}
