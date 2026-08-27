import { NextResponse } from "next/server";

import {
  getLuckPermsGroupDetail,
  groupNameSchema,
} from "@/lib/plugins/luckperms/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  return withPlugin("luckperms", async () => {
    const { name } = await params;
    const groupName = groupNameSchema.parse(name);
    const detail = await getLuckPermsGroupDetail(groupName);
    if (!detail) {
      return NextResponse.json({ message: "未找到该权限组" }, { status: 404 });
    }
    return NextResponse.json(detail);
  });
}
