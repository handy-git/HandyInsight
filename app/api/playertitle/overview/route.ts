import { NextResponse } from "next/server";

import { getTitleOverview } from "@/lib/plugins/playertitle/queries";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET() {
  try {
    await requirePlugin("playertitle");
    return NextResponse.json(await getTitleOverview());
  } catch (error) {
    return apiError(error);
  }
}
