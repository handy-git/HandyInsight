import { NextResponse } from "next/server";

import { getAuthmeAccounts } from "@/lib/plugins/authme/queries";
import { authmePlayersQuerySchema } from "@/lib/plugins/authme/schemas";
import { apiError, searchParamsObject } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(request: Request) {
  try {
    await requirePlugin("authme");
    const { keyword, page } = authmePlayersQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getAuthmeAccounts(keyword, page));
  } catch (error) {
    return apiError(error);
  }
}
