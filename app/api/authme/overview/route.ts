import { NextResponse } from "next/server";

import { getAuthmeOverview } from "@/lib/plugins/authme/queries";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET() {
  try {
    await requirePlugin("authme");
    return NextResponse.json(await getAuthmeOverview());
  } catch (error) {
    return apiError(error);
  }
}
