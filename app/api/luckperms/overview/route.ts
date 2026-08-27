import { NextResponse } from "next/server";

import { getLuckPermsOverview } from "@/lib/plugins/luckperms/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET() {
  return withPlugin("luckperms", async () => {
    return NextResponse.json(await getLuckPermsOverview());
  });
}
