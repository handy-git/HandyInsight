import { NextResponse } from "next/server";

import { getCompanionsOverview } from "@/lib/plugins/companions/queries";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET() {
  try {
    await requirePlugin("companions");
    return NextResponse.json(await getCompanionsOverview());
  } catch (error) {
    return apiError(error);
  }
}
