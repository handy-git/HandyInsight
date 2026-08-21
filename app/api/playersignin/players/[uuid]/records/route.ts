import { NextResponse } from "next/server";

import { getSignInRecords } from "@/lib/plugins/playersignin/queries";
import {
  signInPageQuerySchema,
  signInUuidSchema,
} from "@/lib/plugins/playersignin/schemas";
import { apiError, searchParamsObject } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    await requirePlugin("playersignin");
    const uuid = signInUuidSchema.parse((await params).uuid);
    const { page, pageSize } = signInPageQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(await getSignInRecords(uuid, page, pageSize));
  } catch (error) {
    return apiError(error);
  }
}
