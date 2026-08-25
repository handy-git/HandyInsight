import { NextResponse } from "next/server";

import { getTitleList } from "@/lib/plugins/playertitle/queries";
import { titleListQuerySchema } from "@/lib/plugins/playertitle/schemas";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(request: Request) {
  return withPlugin("playertitle", async () => {
    const { keyword, page, sort, order } = titleListQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getTitleList(keyword, page, sort, order));
  });
}
