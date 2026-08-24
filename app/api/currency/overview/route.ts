import { NextResponse } from "next/server";

import { getCurrencyOverview } from "@/lib/plugins/playercurrency/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET() {
  return withPlugin("playercurrency", async () => {
    return NextResponse.json(await getCurrencyOverview());
  });
}
