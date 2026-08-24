import { NextResponse } from "next/server";

import { getTaskOverview } from "@/lib/plugins/playertask/queries";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET() {
  try {
    await requirePlugin("playertask");
    return NextResponse.json(await getTaskOverview());
  } catch (error) {
    return apiError(error);
  }
}
