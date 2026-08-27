import { NextResponse } from "next/server";

import {
  getLuckPermsGroupList,
  luckPermsGroupsQuerySchema,
} from "@/lib/plugins/luckperms/queries";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("luckperms", async () => {
    const input = luckPermsGroupsQuerySchema.parse(searchParamsObject(request));
    return NextResponse.json(await getLuckPermsGroupList(input));
  });
}
