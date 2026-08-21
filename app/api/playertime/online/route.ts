import { NextResponse } from "next/server";

import { getOnlinePlayers } from "@/lib/playertime/queries";
import { apiError } from "@/lib/server/api";

export async function GET() {
  try {
    return NextResponse.json(await getOnlinePlayers());
  } catch (error) {
    return apiError(error);
  }
}
