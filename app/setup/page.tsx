"use client";

import { useRouter } from "next/navigation";

import { SettingsDialog } from "@/app/setup/setup-dialog";

export default function SetupPage() {
  const router = useRouter();
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted/40 p-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold">HandyInsight</h1>
        <p className="text-sm text-muted-foreground">
          PlayerTime 数据分析面板
        </p>
      </div>
      <SettingsDialog
        open
        onOpenChange={() => undefined}
        onSaved={() => router.push("/dashboard")}
        showCloseButton={false}
        mode="setup"
      />
    </main>
  );
}
