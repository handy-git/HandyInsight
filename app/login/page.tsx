import type { Metadata } from "next";
import Image from "next/image";
import {
  BarChart3Icon,
  DatabaseIcon,
} from "lucide-react";

import { LoginForm } from "@/app/login/login-form";
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
              <Image
                src="/logo.png"
                alt=""
                width={40}
                height={40}
                className="size-10 object-contain"
              />
            </div>
            <p className="font-heading text-base font-semibold">
              HandyInsight
            </p>
          </div>

          <h1 className="max-w-xl text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-6xl">
            <span className="block">让服务器数据</span>
            <span className="block">清晰地说话</span>
          </h1>

          <div className="grid max-w-lg grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border">
            <div className="flex items-center gap-3 bg-background p-4">
              <DatabaseIcon className="size-5 text-muted-foreground" />
              <p className="text-sm font-medium">只读连接</p>
            </div>
            <div className="flex items-center gap-3 bg-background p-4">
              <BarChart3Icon className="size-5 text-muted-foreground" />
              <p className="text-sm font-medium">统一洞察</p>
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
