import { NextResponse } from "next/server";

import {
  getTitleCoinRanking,
  getTitleRanking,
} from "@/lib/plugins/playertitle/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET() {
  return withPlugin("playertitle", async () => {
    const [titles, coins] = await Promise.all([
      getTitleRanking(),
      getTitleCoinRanking(),
    ]);
    return NextResponse.json({ titles, coins });
  });
}
