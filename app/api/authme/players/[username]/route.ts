import { NextResponse } from "next/server";

import { getAuthmeAccountDetail } from "@/lib/plugins/authme/queries";
import { authmeUsernameSchema } from "@/lib/plugins/authme/schemas";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    await requirePlugin("authme");
    const username = authmeUsernameSchema.parse((await params).username);
    const detail = await getAuthmeAccountDetail(username);
    if (!detail) {
      return NextResponse.json(
        { ok: false, message: "未找到该账户" },
        { status: 404 },
      );
    }
    return NextResponse.json(detail);
  } catch (error) {
    return apiError(error);
  }
}
