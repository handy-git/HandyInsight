import { NextResponse } from "next/server";

import { getTitleOverview } from "@/lib/plugins/playertitle/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET() {
  return withPlugin("playertitle", async () => {
    return NextResponse.json(await getTitleOverview());
  });
}
