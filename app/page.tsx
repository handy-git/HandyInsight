import { redirect } from "next/navigation";

import { loadMysqlConfig } from "@/lib/server/config";

export default async function Home() {
  const config = await loadMysqlConfig();
  redirect(config ? "/dashboard" : "/setup");
}
