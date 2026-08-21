import { NextResponse } from "next/server";

import {
  getTitleCoinRanking,
  getTitleRanking,
} from "@/lib/plugins/playertitle/queries";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET() {
  try {
    await requirePlugin("playertitle");
    const [titles, coins] = await Promise.all([
      getTitleRanking(),
      getTitleCoinRanking(),
    ]);
    return NextResponse.json({ titles, coins });
  } catch (error) {
    return apiError(error);
  }
}
