import { z } from "zod";
import { NextResponse } from "next/server";

import { getUnifiedPlayers } from "@/lib/server/unified-players";
import { apiError, searchParamsObject } from "@/lib/server/api";
import { getPool } from "@/lib/server/mysql";

const querySchema = z.object({
  keyword: z.string().trim().max(64).default(""),
  page: z.coerce.number().int().min(1).default(1),
  sort: z
    .enum(["recent", "registered", "playtime", "signin", "intensify"])
    .default("recent"),
});

export async function GET(request: Request) {
  try {
    if (!(await getPool())) {
      return NextResponse.json(
        { ok: false, message: "MySQL 尚未配置，请先完成连接配置" },
        { status: 409 },
      );
    }
    const { keyword, page, sort } = querySchema.parse(searchParamsObject(request));
    return NextResponse.json(await getUnifiedPlayers(keyword, page, sort));
  } catch (error) {
    return apiError(error);
  }
}
