import { NextResponse } from "next/server";

import { getTaskLibrary } from "@/lib/plugins/playertask/queries";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET() {
  try {
    await requirePlugin("playertask");
    return NextResponse.json(await getTaskLibrary());
  } catch (error) {
    return apiError(error);
  }
}
