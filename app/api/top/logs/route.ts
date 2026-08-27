import { NextResponse } from "next/server";

import {
  getTopLogs,
  topLogsQuerySchema,
} from "@/lib/plugins/playertop/queries";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("playertop", async () => {
    const { keyword, papi, page, sort, order } = topLogsQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(
      await getTopLogs({ keyword, papi, page, sort, order }),
    );
  });
}
