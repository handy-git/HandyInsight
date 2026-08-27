import { NextResponse } from "next/server";

import { getTopOverview } from "@/lib/plugins/playertop/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET() {
  return withPlugin("playertop", async () => {
    return NextResponse.json(await getTopOverview());
  });
}
