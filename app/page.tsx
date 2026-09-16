import { redirect } from "next/navigation";

// 入口中转页：直接落到分析面板，未配置 MySQL 时
// 由 (analysis) 布局依据 /api/mysql/status 兜底跳转 /setup
export const dynamic = "force-dynamic";

export default function Home() {
  redirect("/overview/players");
}
