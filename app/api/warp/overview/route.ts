import { NextResponse } from "next/server";

import { getWarpOverview } from "@/lib/plugins/playerwarp/queries";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET() {
  try {
    await requirePlugin("playerwarp");
    return NextResponse.json(await getWarpOverview());
  } catch (error) {
    return apiError(error);
  }
}
