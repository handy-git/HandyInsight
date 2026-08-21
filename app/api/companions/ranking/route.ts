import { NextResponse } from "next/server";

import {
  getCompanionsRanking,
  getEquipmentRanking,
} from "@/lib/plugins/companions/queries";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET() {
  try {
    await requirePlugin("companions");
    const [companions, equipments] = await Promise.all([
      getCompanionsRanking(),
      getEquipmentRanking(),
    ]);
    return NextResponse.json({ companions, equipments });
  } catch (error) {
    return apiError(error);
  }
}
