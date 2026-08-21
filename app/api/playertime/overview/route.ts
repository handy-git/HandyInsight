import { NextResponse } from "next/server";

import { getOverview } from "@/lib/playertime/queries";
import { apiError } from "@/lib/server/api";

export async function GET() {
  try {
    return NextResponse.json(await getOverview());
  } catch (error) {
    return apiError(error);
  }
}
