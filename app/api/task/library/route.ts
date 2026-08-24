import { NextResponse } from "next/server";

import { getTaskLibrary } from "@/lib/plugins/playertask/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET() {
  return withPlugin("playertask", async () => {
    return NextResponse.json(await getTaskLibrary());
  });
}
