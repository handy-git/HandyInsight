import { NextResponse } from "next/server";

import { getPlayers } from "@/lib/playertime/queries";
import { playersQuerySchema } from "@/lib/schemas/playertime";
import { apiError, searchParamsObject } from "@/lib/server/api";

export async function GET(request: Request) {
  try {
    const { keyword, page } = playersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getPlayers(keyword, page));
  } catch (error) {
    return apiError(error);
  }
}
