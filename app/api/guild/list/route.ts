import { NextResponse } from "next/server";

import {
  getGuildList,
  guildListQuerySchema,
} from "@/lib/plugins/playerguild/queries";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("playerguild", async () => {
    const input = guildListQuerySchema.parse(searchParamsObject(request));
    return NextResponse.json(await getGuildList(input));
  });
}
