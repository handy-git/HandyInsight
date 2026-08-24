import { NextResponse } from "next/server";

import {
  getTaskPlayers,
  taskPlayersQuerySchema,
} from "@/lib/plugins/playertask/queries";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("playertask", async () => {
    const { keyword, page } = taskPlayersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getTaskPlayers(keyword, page));
  });
}
