import { NextResponse } from "next/server";

import { getAuthmeAccounts } from "@/lib/plugins/authme/queries";
import { authmePlayersQuerySchema } from "@/lib/plugins/authme/schemas";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("authme", async () => {
    const { keyword, page } = authmePlayersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getAuthmeAccounts(keyword, page));
  });
}
