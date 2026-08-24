import { NextResponse } from "next/server";

import {
  currencyLogsQuerySchema,
  getCurrencyLogs,
} from "@/lib/plugins/playercurrency/queries";
import { apiError, searchParamsObject } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(request: Request) {
  try {
    await requirePlugin("playercurrency");
    const { keyword, type, page } = currencyLogsQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getCurrencyLogs({ keyword, type, page }));
  } catch (error) {
    return apiError(error);
  }
}
