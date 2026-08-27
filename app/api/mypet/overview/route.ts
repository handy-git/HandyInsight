import { NextResponse } from "next/server";

import { getMypetOverview } from "@/lib/plugins/mypet/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET() {
  return withPlugin("mypet", async () => {
    return NextResponse.json(await getMypetOverview());
  });
}
