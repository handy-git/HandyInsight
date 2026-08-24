import { NextResponse } from "next/server";

import {
  getCompanionsRanking,
  getEquipmentRanking,
} from "@/lib/plugins/companions/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET() {
  return withPlugin("companions", async () => {
    const [companions, equipments] = await Promise.all([
      getCompanionsRanking(),
      getEquipmentRanking(),
    ]);
    return NextResponse.json({ companions, equipments });
  });
}
