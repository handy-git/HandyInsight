"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3Icon,
  BookOpenIcon,
  CalendarCheckIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  CoinsIcon,
  CrownIcon,
  EggIcon,
  GiftIcon,
  HammerIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  MedalIcon,
  PawPrintIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShieldIcon,
  SwordsIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";

import { SettingsDialog } from "@/app/setup/setup-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  applyPluginPrefs,
  getPluginPrefsSnapshot,
  getServerPluginPrefsSnapshot,
  subscribePluginPrefs,
} from "@/lib/common/plugin-prefs";
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
  companions: {
    label: "CompanionsPlus · 小精灵",
    items: [
      { href: "/companions", label: "小精灵总览", icon: PawPrintIcon },
      { href: "/companions/players", label: "小精灵玩家", icon: UsersIcon },
    ],
  },
  playertitle: {
    label: "PlayerTitle · 称号",
    items: [
      { href: "/title", label: "称号总览", icon: MedalIcon },
      { href: "/title/list", label: "称号库", icon: MedalIcon },
      { href: "/title/players", label: "称号玩家", icon: UsersIcon },
    ],
  },
  playertask: {
    label: "PlayerTask · 任务",
    items: [
      { href: "/task", label: "任务总览", icon: ClipboardListIcon },
      { href: "/task/players", label: "任务玩家", icon: UsersIcon },
      { href: "/task/library", label: "任务库", icon: BookOpenIcon },
    ],
  },
  playerwarp: {
    label: "PlayerWarp · 地标",
    items: [
      { href: "/warp", label: "地标总览", icon: MapPinIcon },
      { href: "/warp/list", label: "地标库", icon: MapPinIcon },
      { href: "/warp/players", label: "地标玩家", icon: UsersIcon },
    ],
  },
  playercurrency: {
    label: "PlayerCurrency · 货币",
    items: [
      { href: "/currency", label: "货币总览", icon: CoinsIcon },
      { href: "/currency/logs", label: "货币流水", icon: CoinsIcon },
      { href: "/currency/players", label: "货币玩家", icon: UsersIcon },
    ],
  },
  playerintensify: {
    label: "PlayerIntensify · 强化",
    items: [
      { href: "/intensify", label: "强化总览", icon: HammerIcon },
      { href: "/intensify/players", label: "强化玩家", icon: UsersIcon },
    ],
  },
  playerguild: {
    label: "PlayerGuild · 公会",
    items: [
      { href: "/guild", label: "公会总览", icon: CrownIcon },
      { href: "/guild/list", label: "公会列表", icon: SwordsIcon },
    ],
  },
  luckperms: {
    label: "LuckPerms · 权限",
    items: [
      { href: "/luckperms", label: "权限总览", icon: ShieldIcon },
      { href: "/luckperms/groups", label: "权限组", icon: KeyRoundIcon },
      { href: "/luckperms/players", label: "权限玩家", icon: UsersIcon },
      { href: "/luckperms/logs", label: "操作日志", icon: ScrollTextIcon },
    ],
  },
  mypet: {
    label: "MyPet · 宠物",
    items: [
      { href: "/mypet", label: "宠物总览", icon: EggIcon },
      { href: "/mypet/players", label: "宠物玩家", icon: UsersIcon },
    ],
  },
  playertop: {
    label: "PlayerTop · 排行",
    items: [
      { href: "/top", label: "排行总览", icon: TrophyIcon },
      { href: "/top/ranking", label: "排行榜", icon: TrophyIcon },
      { href: "/top/logs", label: "发奖记录", icon: GiftIcon },
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
  const prefs = useSyncExternalStore(
    subscribePluginPrefs,
    getPluginPrefsSnapshot,
    getServerPluginPrefsSnapshot,
  );

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

  const navGroups = applyPluginPrefs(
    (plugins ?? [])
      .map((plugin) => ({ id: plugin.id, plugin, nav: PLUGIN_NAV[plugin.id] }))
      .filter((entry) => entry.nav),
    prefs,
  );

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={<Link href="/overview/players" />}
              >
                <Image
                  src="/logo.png"
                  alt=""
                  width={28}
                  height={28}
                  className="size-7 shrink-0 object-contain"
                />
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
            <Collapsible key={plugin.id} defaultOpen>
              <SidebarGroup>
                <SidebarGroupLabel
                  render={<CollapsibleTrigger />}
                  className="group/trigger cursor-pointer"
                >
                  {nav.label}
                  <ChevronDownIcon className="ml-auto transition-transform group-data-[panel-open]/trigger:rotate-180" />
                </SidebarGroupLabel>
                <CollapsibleContent>
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
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
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
