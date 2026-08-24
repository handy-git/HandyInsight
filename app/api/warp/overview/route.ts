import { NextResponse } from "next/server";

import { getWarpOverview } from "@/lib/plugins/playerwarp/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET() {
  return withPlugin("playerwarp", async () => {
    return NextResponse.json(await getWarpOverview());
  });
}
