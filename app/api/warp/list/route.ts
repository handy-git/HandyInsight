import { NextResponse } from "next/server";

import {
  getWarpList,
  warpListQuerySchema,
} from "@/lib/plugins/playerwarp/queries";
import { apiError, searchParamsObject } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(request: Request) {
  try {
    await requirePlugin("playerwarp");
    const input = warpListQuerySchema.parse(searchParamsObject(request));
    return NextResponse.json(await getWarpList(input));
  } catch (error) {
    return apiError(error);
  }
}
