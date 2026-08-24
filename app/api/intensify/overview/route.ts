import { NextResponse } from "next/server";

import { getIntensifyOverview } from "@/lib/plugins/playerintensify/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET() {
  return withPlugin("playerintensify", async () => {
    return NextResponse.json(await getIntensifyOverview());
  });
}
