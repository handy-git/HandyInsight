import { NextResponse } from "next/server";

import {
  currencyLogsQuerySchema,
  getCurrencyLogs,
} from "@/lib/plugins/playercurrency/queries";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("playercurrency", async () => {
    const { keyword, type, page } = currencyLogsQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getCurrencyLogs({ keyword, type, page }));
  });
}
