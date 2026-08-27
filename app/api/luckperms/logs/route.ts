import { NextResponse } from "next/server";

import {
  getLuckPermsLogPage,
  luckPermsLogsQuerySchema,
} from "@/lib/plugins/luckperms/queries";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("luckperms", async () => {
    const input = luckPermsLogsQuerySchema.parse(searchParamsObject(request));
    return NextResponse.json(await getLuckPermsLogPage(input));
  });
}
