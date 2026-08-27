import { NextResponse } from "next/server";

import {
  getLuckPermsPlayers,
  luckPermsPlayersQuerySchema,
} from "@/lib/plugins/luckperms/queries";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("luckperms", async () => {
    const input = luckPermsPlayersQuerySchema.parse(searchParamsObject(request));
    return NextResponse.json(await getLuckPermsPlayers(input));
  });
}
