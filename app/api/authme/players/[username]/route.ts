import { NextResponse } from "next/server";

import { getAuthmeAccountDetail } from "@/lib/plugins/authme/queries";
import { authmeUsernameSchema } from "@/lib/plugins/authme/schemas";
import { withPlugin } from "@/lib/server/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  return withPlugin("authme", async () => {
    const username = authmeUsernameSchema.parse((await params).username);
    const detail = await getAuthmeAccountDetail(username);
    if (!detail) {
      return NextResponse.json(
        { ok: false, message: "未找到该账户" },
        { status: 404 },
      );
    }
    return NextResponse.json(detail);
  });
}
