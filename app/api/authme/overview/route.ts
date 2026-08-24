import { NextResponse } from "next/server";

import { getAuthmeOverview } from "@/lib/plugins/authme/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET() {
  return withPlugin("authme", async () => {
    return NextResponse.json(await getAuthmeOverview());
  });
}
