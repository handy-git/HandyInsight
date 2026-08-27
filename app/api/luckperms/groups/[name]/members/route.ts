import { NextResponse } from "next/server";

import {
  getLuckPermsGroupMembers,
  groupNameSchema,
  luckPermsGroupMemberQuerySchema,
} from "@/lib/plugins/luckperms/queries";
import { searchParamsObject, withPlugin } from "@/lib/server/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  return withPlugin("luckperms", async () => {
    const { name } = await params;
    const groupName = groupNameSchema.parse(name);
    const input = luckPermsGroupMemberQuerySchema.parse(
      searchParamsObject(request),
    );
    return NextResponse.json(
      await getLuckPermsGroupMembers(
        groupName,
        input.keyword,
        input.page,
      ),
    );
  });
}
