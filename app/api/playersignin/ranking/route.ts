import { NextResponse } from "next/server";

import { getSignInRanking } from "@/lib/plugins/playersignin/queries";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET() {
  try {
    await requirePlugin("playersignin");
    return NextResponse.json(await getSignInRanking());
  } catch (error) {
    return apiError(error);
  }
}
