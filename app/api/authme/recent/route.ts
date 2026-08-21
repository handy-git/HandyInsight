import { NextResponse } from "next/server";

import {
  getRecentLogins,
  getRecentRegistrations,
} from "@/lib/plugins/authme/queries";
import { apiError } from "@/lib/server/api";
import { requirePlugin } from "@/lib/server/mysql";

export async function GET() {
  try {
    await requirePlugin("authme");
    const [logins, registrations] = await Promise.all([
      getRecentLogins(),
      getRecentRegistrations(),
    ]);
    return NextResponse.json({ logins, registrations });
  } catch (error) {
    return apiError(error);
  }
}
