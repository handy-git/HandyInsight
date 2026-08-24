import { NextResponse } from "next/server";

import {
  getRecentLogins,
  getRecentRegistrations,
} from "@/lib/plugins/authme/queries";
import { withPlugin } from "@/lib/server/api";

export async function GET() {
  return withPlugin("authme", async () => {
    const [logins, registrations] = await Promise.all([
      getRecentLogins(),
      getRecentRegistrations(),
    ]);
    return NextResponse.json({ logins, registrations });
  });
}
