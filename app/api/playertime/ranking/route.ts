import { NextResponse } from "next/server";

import { getRanking } from "@/lib/playertime/queries";
import { rankingQuerySchema } from "@/lib/schemas/playertime";
import { apiError, searchParamsObject } from "@/lib/server/api";

export async function GET(request: Request) {
  try {
    const { scope, page } = rankingQuerySchema.parse(searchParamsObject(request));
    return NextResponse.json(await getRanking(scope, page));
  } catch (error) {
    return apiError(error);
  }
}
