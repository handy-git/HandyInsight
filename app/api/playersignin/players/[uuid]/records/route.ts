import { NextResponse } from "next/server";

import { getSignInRecords } from "@/lib/plugins/playersignin/queries";
import {
  signInPageQuerySchema,
  signInUuidSchema,
} from "@/lib/plugins/playersignin/schemas";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  return withPlugin("playersignin", async () => {
    const uuid = signInUuidSchema.parse((await params).uuid);
    const { page, pageSize } = signInPageQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getSignInRecords(uuid, page, pageSize));
  });
}
