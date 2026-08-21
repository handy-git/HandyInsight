"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3Icon, SettingsIcon, UsersIcon } from "lucide-react";

import { SettingsDialog } from "@/app/setup/setup-dialog";

import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { href: "/dashboard", label: "数据总览", icon: BarChart3Icon },
  { href: "/players", label: "玩家列表", icon: UsersIcon },
];

export default function AnalysisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [setupOpen, setSetupOpen] = useState(false);

  useEffect(() => {
    fetch("/api/mysql/status")
      .then((response) => response.json())
      .then((status: { configured: boolean }) => {
        if (!status.configured) {
          router.replace("/setup");
        }
      })
      .catch(() => undefined);
  }, [router]);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
                <span className="font-semibold">HandyInsight</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>PlayerTime 分析</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={pathname.startsWith(item.href)}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setSetupOpen(true)}>
                <SettingsIcon />
                <span>设置</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <span className="text-sm text-muted-foreground">
            PlayerTime 数据分析
          </span>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
      <SettingsDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onSaved={() => {
          setSetupOpen(false);
          router.refresh();
        }}
        mode="settings"
      />
    </SidebarProvider>
  );
}
