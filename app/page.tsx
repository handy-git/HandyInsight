"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";

interface MysqlStatus {
  configured: boolean;
  plugins?: { landing: string }[];
}

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function redirectFromStatus() {
      try {
        const response = await fetch("/api/mysql/status");
        if (cancelled) return;
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) {
          throw new Error("MySQL 状态请求失败");
        }
        const status = (await response.json()) as MysqlStatus;
        if (cancelled) return;
        router.replace(
          status.configured
            ? (status.plugins?.[0]?.landing ?? "/dashboard")
            : "/setup",
        );
      } catch {
        if (!cancelled) router.replace("/setup");
      }
    }

    void redirectFromStatus();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40">
      <Spinner className="size-5" />
      <span className="sr-only">正在加载数据库状态</span>
    </main>
  );
}
