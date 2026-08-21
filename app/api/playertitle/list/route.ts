import { NextResponse } from "next/server";

import { getTitleList } from "@/lib/plugins/playertitle/queries";
import { titleListQuerySchema } from "@/lib/plugins/playertitle/schemas";
import { apiError, searchParamsObject } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(request: Request) {
  try {
    await requirePlugin("playertitle");
    const { keyword, page } = titleListQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getTitleList(keyword, page));
  } catch (error) {
    return apiError(error);
  }
}
