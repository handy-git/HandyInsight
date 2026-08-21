"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3Icon,
  CalendarCheckIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";

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

interface StatusPlugin {
  id: string;
  name: string;
  description: string;
  landing: string;
}

/** 各插件的导航项（客户端图标在此绑定，服务端注册表不含 UI 信息）。 */
const PLUGIN_NAV: Record<
  string,
  {
    label: string;
    items: { href: string; label: string; icon: typeof BarChart3Icon }[];
  }
> = {
  playertime: {
    label: "PlayerTime · 时长",
    items: [
      { href: "/dashboard", label: "数据总览", icon: BarChart3Icon },
      { href: "/players", label: "玩家列表", icon: UsersIcon },
    ],
  },
  playersignin: {
    label: "PlayerSignIn · 签到",
    items: [
      { href: "/signin", label: "签到总览", icon: CalendarCheckIcon },
      { href: "/signin/players", label: "签到玩家", icon: UsersIcon },
    ],
  },
  authme: {
    label: "AuthMe · 账户",
    items: [
      { href: "/authme", label: "账户总览", icon: ShieldCheckIcon },
      { href: "/authme/players", label: "账户列表", icon: UsersIcon },
    ],
  },
};

export default function AnalysisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [setupOpen, setSetupOpen] = useState(false);
  const [plugins, setPlugins] = useState<StatusPlugin[] | null>(null);

  useEffect(() => {
    fetch("/api/mysql/status")
      .then((response) => response.json())
      .then((status: { configured: boolean; plugins?: StatusPlugin[] }) => {
        if (!status.configured) {
          router.replace("/setup");
          return;
        }
        setPlugins(status.plugins ?? []);
      })
      .catch(() => undefined);
  }, [router]);

  const navGroups = (plugins ?? [])
    .map((plugin) => ({ plugin, nav: PLUGIN_NAV[plugin.id] }))
    .filter((entry) => entry.nav);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={
                  <Link href={plugins?.[0]?.landing ?? "/dashboard"} />
                }
              >
                <span className="font-semibold">HandyInsight</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {plugins !== null && navGroups.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>总览</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname.startsWith("/overview")}
                      render={<Link href="/overview/players" />}
                    >
                      <LayoutDashboardIcon />
                      <span>全服玩家</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
          {navGroups.map(({ plugin, nav }) => (
            <SidebarGroup key={plugin.id}>
              <SidebarGroupLabel>{nav.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {nav.items.map((item) => (
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
          ))}
          {plugins !== null && navGroups.length === 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>未启用任何插件</SidebarGroupLabel>
            </SidebarGroup>
          )}
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
            HandyInsight 数据分析
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
