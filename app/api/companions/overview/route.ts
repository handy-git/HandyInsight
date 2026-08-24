import { NextResponse } from "next/server";

import { getCompanionsOverview } from "@/lib/plugins/companions/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET() {
  return withPlugin("companions", async () => {
    return NextResponse.json(await getCompanionsOverview());
  });
}
