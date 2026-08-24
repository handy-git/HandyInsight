import { NextResponse } from "next/server";

import { getOverview } from "@/lib/plugins/playertime/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET() {
  return withPlugin("playertime", async () => {
    return NextResponse.json(await getOverview());
  });
}
