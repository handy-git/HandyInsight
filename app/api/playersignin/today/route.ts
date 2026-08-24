import { NextResponse } from "next/server";

import { getTodaySignIns } from "@/lib/plugins/playersignin/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET() {
  return withPlugin("playersignin", async () => {
    return NextResponse.json(await getTodaySignIns());
  });
}
