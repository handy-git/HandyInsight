import { NextResponse } from "next/server";

import { getCurrencyOverview } from "@/lib/plugins/playercurrency/queries";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET() {
  try {
    await requirePlugin("playercurrency");
    return NextResponse.json(await getCurrencyOverview());
  } catch (error) {
    return apiError(error);
  }
}
