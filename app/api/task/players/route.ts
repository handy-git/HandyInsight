import { NextResponse } from "next/server";

import {
  getTaskPlayers,
  taskPlayersQuerySchema,
} from "@/lib/plugins/playertask/queries";
import { apiError, searchParamsObject } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(request: Request) {
  try {
    await requirePlugin("playertask");
    const { keyword, page } = taskPlayersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getTaskPlayers(keyword, page));
  } catch (error) {
    return apiError(error);
  }
}
