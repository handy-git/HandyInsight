"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AlertCircleIcon, UserXIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { fetchJson } from "@/lib/common/format";
import type {
  AuthmeOverview,
  AuthmeRecentLogin,
  AuthmeRecentRegistration,
  AuthmeTrendPoint,
} from "@/lib/plugins/authme/types";

const chartConfig = {
  registrations: { label: "新注册", color: "var(--chart-1)" },
} satisfies ChartConfig;

type TrendRange = "7d" | "30d";

interface RecentData {
  logins: AuthmeRecentLogin[];
  registrations: AuthmeRecentRegistration[];
}

export default function AuthmeDashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<AuthmeOverview | null>(null);
  const [range, setRange] = useState<TrendRange>("7d");
  const [trend, setTrend] = useState<AuthmeTrendPoint[] | null>(null);
  const [recent, setRecent] = useState<RecentData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchJson<AuthmeOverview>("/api/authme/overview"),
      fetchJson<RecentData>("/api/authme/recent"),
    ])
      .then(([overviewData, recentData]) => {
        setOverview(overviewData);
        setRecent(recentData);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const loadTrend = useCallback((nextRange: TrendRange) => {
    fetchJson<AuthmeTrendPoint[]>(`/api/authme/trend?range=${nextRange}`)
      .then(setTrend)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    loadTrend(range);
  }, [range, loadTrend]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>数据加载失败</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const chartData = (trend ?? []).map((point) => ({
    date: point.date.slice(5),
    registrations: point.registrations,
  }));

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "注册玩家", value: overview?.totalPlayers, suffix: "人" },
          { title: "当前登录中", value: overview?.loggedPlayers, suffix: "人" },
          { title: "今日注册", value: overview?.todayRegistered, suffix: "人" },
          { title: "今日登录", value: overview?.todayLoggedIn, suffix: "人" },
        ].map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-2xl">
                {card.value === undefined ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    {card.value}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      {card.suffix}
                    </span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>近期登录活跃</CardTitle>
          <CardDescription>按最近一次登录时间统计的活跃账户数</CardDescription>
        </CardHeader>
        <CardContent>
          {overview === null ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="grid grid-cols-3 divide-x">
              {[
                { title: "24 小时内", value: overview.active24h },
                { title: "7 天内", value: overview.active7d },
                { title: "30 天内", value: overview.active30d },
              ].map((item) => (
                <div key={item.title} className="flex flex-col items-center gap-1 px-4">
                  <span className="text-2xl font-semibold text-foreground">
                    {item.value}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.title}登录 {item.value} 人
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>注册趋势</CardTitle>
            <CardDescription>每日新注册账户数</CardDescription>
          </div>
          <ToggleGroup
            value={[range]}
            onValueChange={(values) => {
              const next = values[0] as TrendRange | undefined;
              if (next) setRange(next);
            }}
          >
            <ToggleGroupItem value="7d">近 7 天</ToggleGroupItem>
            <ToggleGroupItem value="30d">近 30 天</ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent>
          {trend === null ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="registrations"
                  fill="var(--color-registrations)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近登录</CardTitle>
            <CardDescription>点击玩家查看账户详情</CardDescription>
          </CardHeader>
          <CardContent>
            {recent === null ? (
              <Skeleton className="h-48 w-full" />
            ) : recent.logins.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <UserXIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无登录记录</EmptyTitle>
                  <EmptyDescription>还没有任何账户登录过。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>玩家</TableHead>
                    <TableHead>登录时间</TableHead>
                    <TableHead className="text-right">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.logins.map((login) => (
                    <TableRow
                      key={login.username}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/authme/players/${login.username}`)
                      }
                    >
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          {login.realname}
                          {login.logged && <Badge>在线</Badge>}
                        </span>
                      </TableCell>
                      <TableCell>{login.lastLoginAt}</TableCell>
                      <TableCell className="text-right">
                        {login.ip ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近注册</CardTitle>
            <CardDescription>新注册的账户</CardDescription>
          </CardHeader>
          <CardContent>
            {recent === null ? (
              <Skeleton className="h-48 w-full" />
            ) : recent.registrations.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <UserXIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无注册记录</EmptyTitle>
                  <EmptyDescription>还没有任何账户注册。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>玩家</TableHead>
                    <TableHead>注册时间</TableHead>
                    <TableHead className="text-right">注册 IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.registrations.map((registration) => (
                    <TableRow
                      key={registration.username}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/authme/players/${registration.username}`,
                        )
                      }
                    >
                      <TableCell className="font-medium">
                        {registration.realname}
                      </TableCell>
                      <TableCell>{registration.regDate}</TableCell>
                      <TableCell className="text-right">
                        {registration.regIp ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
