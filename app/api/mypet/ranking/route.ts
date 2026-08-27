import { NextResponse } from "next/server";

import {
  getMypetPlayerRanking,
  getMypetTypeRanking,
} from "@/lib/plugins/mypet/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET() {
  return withPlugin("mypet", async () => {
    const [types, players] = await Promise.all([
      getMypetTypeRanking(),
      getMypetPlayerRanking(),
    ]);
    return NextResponse.json({ types, players });
  });
}
