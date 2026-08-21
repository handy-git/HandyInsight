"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AlertCircleIcon, CalendarXIcon } from "lucide-react";

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
  SignInOverview,
  SignInRankingEntry,
  SignInTrendPoint,
  TodaySignIn,
} from "@/lib/plugins/playersignin/types";

const chartConfig = {
  signs: { label: "签到人数", color: "var(--chart-1)" },
} satisfies ChartConfig;

type TrendRange = "7d" | "30d";

export default function SignInDashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<SignInOverview | null>(null);
  const [range, setRange] = useState<TrendRange>("7d");
  const [trend, setTrend] = useState<SignInTrendPoint[] | null>(null);
  const [today, setToday] = useState<TodaySignIn[] | null>(null);
  const [ranking, setRanking] = useState<SignInRankingEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchJson<SignInOverview>("/api/playersignin/overview"),
      fetchJson<TodaySignIn[]>("/api/playersignin/today"),
      fetchJson<SignInRankingEntry[]>("/api/playersignin/ranking"),
    ])
      .then(([overviewData, todayData, rankingData]) => {
        setOverview(overviewData);
        setToday(todayData);
        setRanking(rankingData);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const loadTrend = useCallback((nextRange: TrendRange) => {
    fetchJson<SignInTrendPoint[]>(`/api/playersignin/trend?range=${nextRange}`)
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
    signs: point.signs,
  }));

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "今日签到", value: overview?.todaySigns, suffix: "人" },
          { title: "累计签到", value: overview?.totalSigns, suffix: "人次" },
          { title: "签到玩家", value: overview?.totalPlayers, suffix: "人" },
          { title: "补签卡库存", value: overview?.totalCards, suffix: "张" },
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
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>签到趋势</CardTitle>
            <CardDescription>每日签到人数</CardDescription>
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
            <Skeleton className="h-72 w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="signs"
                  fill="var(--color-signs)"
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
            <CardTitle>今日签到名单</CardTitle>
            <CardDescription>按签到时间排序</CardDescription>
          </CardHeader>
          <CardContent>
            {today === null ? (
              <Skeleton className="h-48 w-full" />
            ) : today.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarXIcon />
                  </EmptyMedia>
                  <EmptyTitle>今日暂无签到</EmptyTitle>
                  <EmptyDescription>今天还没有玩家签到。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">名次</TableHead>
                    <TableHead>玩家</TableHead>
                    <TableHead className="text-right">签到时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {today.map((item) => (
                    <TableRow
                      key={item.uuid}
                      className="cursor-pointer"
                      onClick={() => router.push(`/signin/players/${item.uuid}`)}
                    >
                      <TableCell>
                        <Badge variant={item.rank <= 3 ? "default" : "outline"}>
                          {item.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>累计签到排行</CardTitle>
            <CardDescription>点击玩家查看详情</CardDescription>
          </CardHeader>
          <CardContent>
            {ranking === null ? (
              <Skeleton className="h-48 w-full" />
            ) : ranking.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarXIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无排行数据</EmptyTitle>
                  <EmptyDescription>还没有任何签到记录。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">名次</TableHead>
                    <TableHead>玩家</TableHead>
                    <TableHead className="text-right">累计签到</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((entry) => (
                    <TableRow
                      key={entry.uuid}
                      className="cursor-pointer"
                      onClick={() => router.push(`/signin/players/${entry.uuid}`)}
                    >
                      <TableCell>
                        <Badge variant={entry.rank <= 3 ? "default" : "outline"}>
                          {entry.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell className="text-right">
                        {entry.signs} 次
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
