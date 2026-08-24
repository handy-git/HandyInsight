import { NextResponse } from "next/server";

import {
  getWarpList,
  warpListQuerySchema,
} from "@/lib/plugins/playerwarp/queries";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("playerwarp", async () => {
    const input = warpListQuerySchema.parse(searchParamsObject(request));
    return NextResponse.json(await getWarpList(input));
  });
}
