import { redirect } from "next/navigation";

import { loadMysqlConfig } from "@/lib/server/config";
import { getEnabledPlugins } from "@/lib/server/mysql";

export default async function Home() {
  const config = await loadMysqlConfig();
  if (!config) {
    redirect("/setup");
  }
  // 进入第一个已启用插件的落地页；数据库暂不可达时退回默认总览页
  const plugins = await getEnabledPlugins().catch(() => []);
  redirect(plugins[0]?.landing ?? "/dashboard");
}
