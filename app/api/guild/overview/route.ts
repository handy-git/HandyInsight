import { NextResponse } from "next/server";

import { getGuildOverview } from "@/lib/plugins/playerguild/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET() {
  return withPlugin("playerguild", async () => {
    return NextResponse.json(await getGuildOverview());
  });
}
