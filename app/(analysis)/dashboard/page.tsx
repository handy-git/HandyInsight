"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AlertCircleIcon, UserXIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { playerAvatarUrl } from "@/lib/common/avatar";
import {
  fetchJson,
  formatDateTime,
  formatSeconds,
  secondsToHours,
} from "@/lib/common/format";
import type {
  OnlinePlayer,
  Paginated,
  PlayertimeOverview,
  RankingEntry,
  TrendPoint,
  TrendRange,
} from "@/lib/plugins/playertime/types";

const chartConfig = {
  hours: { label: "在线时长（小时）", color: "var(--chart-1)" },
  players: { label: "活跃玩家", color: "var(--chart-2)" },
} satisfies ChartConfig;

export default function DashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<PlayertimeOverview | null>(null);
  const [range, setRange] = useState<TrendRange>("7d");
  const [trend, setTrend] = useState<TrendPoint[] | null>(null);
  const [online, setOnline] = useState<OnlinePlayer[] | null>(null);
  const [ranking, setRanking] = useState<Paginated<RankingEntry> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchJson<PlayertimeOverview>("/api/playertime/overview"),
      fetchJson<OnlinePlayer[]>("/api/playertime/online"),
      fetchJson<Paginated<RankingEntry>>("/api/playertime/ranking?scope=today&page=1"),
    ])
      .then(([overviewData, onlineData, rankingData]) => {
        setOverview(overviewData);
        setOnline(onlineData);
        setRanking(rankingData);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const loadTrend = useCallback((nextRange: TrendRange) => {
    fetchJson<TrendPoint[]>(`/api/playertime/trend?range=${nextRange}`)
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
        <AlertDescription>
          {error}
          <Link href="/setup" className="ml-2 underline">
            检查数据库配置
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  const chartData = (trend ?? []).map((point) => ({
    date: point.date.slice(5),
    hours: secondsToHours(point.seconds),
    players: point.players,
  }));

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "当前在线", value: overview?.onlinePlayers, suffix: "人" },
          { title: "今日活跃", value: overview?.todayActivePlayers, suffix: "人" },
          {
            title: "今日累计在线",
            value: overview ? formatSeconds(overview.todaySeconds) : undefined,
          },
          {
            title: "今日平均会话",
            value: overview ? formatSeconds(overview.averageSessionSeconds) : undefined,
          },
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
                    {card.suffix && (
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        {card.suffix}
                      </span>
                    )}
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
            <CardTitle>在线趋势</CardTitle>
            <CardDescription>每日在线时长与活跃玩家数</CardDescription>
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
              <AreaChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis yAxisId="hours" tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="players"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  yAxisId="hours"
                  type="monotone"
                  dataKey="hours"
                  stroke="var(--color-hours)"
                  fill="var(--color-hours)"
                  fillOpacity={0.2}
                />
                <Area
                  yAxisId="players"
                  type="monotone"
                  dataKey="players"
                  stroke="var(--color-players)"
                  fill="var(--color-players)"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>当前在线玩家</CardTitle>
            <CardDescription>按登录时间排序</CardDescription>
          </CardHeader>
          <CardContent>
            {online === null ? (
              <Skeleton className="h-48 w-full" />
            ) : online.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <UserXIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无在线玩家</EmptyTitle>
                  <EmptyDescription>当前没有玩家在线。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>玩家</TableHead>
                    <TableHead>登录时间</TableHead>
                    <TableHead className="text-right">本次时长</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {online.map((player) => (
                    <TableRow
                      key={player.uuid}
                      className="cursor-pointer"
                      onClick={() => router.push(`/players/${player.uuid}`)}
                    >
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <Avatar size="sm">
                            <AvatarImage
                              src={playerAvatarUrl(player.name, 32)}
                              alt={player.name}
                            />
                            <AvatarFallback>
                              {player.name.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{player.name}</span>
                        </span>
                      </TableCell>
                      <TableCell>{formatDateTime(player.loginTime) || player.loginTime}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {formatSeconds(player.sessionSeconds)}
                        </Badge>
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
            <CardTitle>今日在线时长排行</CardTitle>
            <CardDescription>点击玩家查看详情</CardDescription>
          </CardHeader>
          <CardContent>
            {ranking === null ? (
              <Skeleton className="h-48 w-full" />
            ) : ranking.items.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <UserXIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无排行数据</EmptyTitle>
                  <EmptyDescription>今日还没有玩家在线记录。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">名次</TableHead>
                    <TableHead>玩家</TableHead>
                    <TableHead className="text-right">今日时长</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.items.map((entry) => (
                    <TableRow
                      key={entry.uuid}
                      className="cursor-pointer"
                      onClick={() => router.push(`/players/${entry.uuid}`)}
                    >
                      <TableCell>
                        <Badge variant={entry.rank <= 3 ? "default" : "outline"}>
                          {entry.rank}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <Avatar size="sm">
                            <AvatarImage
                              src={playerAvatarUrl(entry.name, 32)}
                              alt={entry.name}
                            />
                            <AvatarFallback>
                              {entry.name.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{entry.name}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatSeconds(entry.seconds)}
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
