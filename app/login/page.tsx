import type { Metadata } from "next";
import {
  BarChart3Icon,
  DatabaseIcon,
  ScanSearchIcon,
} from "lucide-react";

import { LoginForm } from "@/app/login/login-form";
import { Badge } from "@/components/ui/badge";
import {
  isAuthConfigured,
  normalizeRedirectPath,
} from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "登录 | HandyInsight",
  description: "登录 HandyInsight Minecraft 数据分析面板",
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = Array.isArray(params.next) ? params.next[0] : params.next;

  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:4rem_4rem] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />
      <div
        aria-hidden="true"
        className="absolute -left-32 top-1/3 size-96 rounded-full border border-border/70"
      />
      <div className="relative mx-auto grid min-h-svh w-full max-w-7xl items-center gap-14 px-6 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:px-12">
        <section className="flex max-w-2xl flex-col gap-10">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border bg-background">
              <ScanSearchIcon className="size-5" />
            </div>
            <div>
              <p className="font-heading text-base font-semibold">
                HandyInsight
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <Badge variant="outline" className="w-fit">
              只读数据分析
            </Badge>
            <h1 className="max-w-xl text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-6xl">
              让服务器数据 清晰地说话
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
              在一个安静、只读的空间里查看玩家活跃、签到、账户、宠物与称号数据。
            </p>
          </div>

          <div className="grid max-w-lg grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border">
            <div className="flex items-center gap-3 bg-background p-4">
              <DatabaseIcon className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">只读连接</p>
                <p className="text-xs text-muted-foreground">不修改插件数据</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-background p-4">
              <BarChart3Icon className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">统一洞察</p>
                <p className="text-xs text-muted-foreground">多个插件，一处查看</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex justify-center lg:justify-end">
          <LoginForm
            configured={isAuthConfigured()}
            redirectTo={normalizeRedirectPath(next)}
          />
        </section>
      </div>
    </main>
  );
}
