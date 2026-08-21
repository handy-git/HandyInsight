import { NextResponse } from "next/server";

import { getOnlinePlayers } from "@/lib/plugins/playertime/queries";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET() {
  try {
    await requirePlugin("playertime");
    return NextResponse.json(await getOnlinePlayers());
  } catch (error) {
    return apiError(error);
  }
}
