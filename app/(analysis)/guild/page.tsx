"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  AlertCircleIcon,
  CrownIcon,
  FlameIcon,
  CalendarCheckIcon,
  SwordsIcon,
  TrendingUpIcon,
} from "lucide-react";

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
import { fetchJson, formatNumber } from "@/lib/common/format";
import { McText } from "@/lib/common/mc-text";
import type { GuildOverview } from "@/lib/plugins/playerguild/types";

const chartConfig = {
  signs: { label: "公会签到人数", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function GuildDashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<GuildOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<GuildOverview>("/api/guild/overview")
      .then(setOverview)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>数据加载失败</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const chartData = (overview?.signInTrend ?? []).map((point) => ({
    date: point.date.slice(5),
    signs: point.count,
  }));

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "公会总数", value: overview?.totalGuilds, suffix: "个" },
          { title: "公会成员", value: overview?.totalMembers, suffix: "人" },
          { title: "公会资金总额", value: overview?.totalMoney, suffix: "" },
          {
            title: "今日公会签到",
            value: overview?.todaySignIns,
            suffix: "人次",
          },
        ].map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-2xl">
                {card.value === undefined ? (
                  <Skeleton className="h-8 w-24" />
                ) : card.value === null ? (
                  "—"
                ) : (
                  <>
                    {formatNumber(card.value)}
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

      {overview?.signInTrend && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheckIcon className="size-4 text-muted-foreground" />
              公会签到趋势
            </CardTitle>
            <CardDescription>近 30 天每日公会签到人次</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlameIcon className="size-4 text-muted-foreground" />
              活跃度排行
            </CardTitle>
            <CardDescription>按公会累计活跃度统计前 10 名</CardDescription>
          </CardHeader>
          <CardContent>
            {overview === null ? (
              <Skeleton className="h-48 w-full" />
            ) : overview.prosperityRanking.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CrownIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无公会</EmptyTitle>
                  <EmptyDescription>还没有玩家创建公会。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">名次</TableHead>
                    <TableHead>公会</TableHead>
                    <TableHead className="text-right">活跃度</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.prosperityRanking.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/guild/list/${entry.id}`)}
                    >
                      <TableCell>
                        <Badge variant={entry.rank <= 3 ? "default" : "outline"}>
                          {entry.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <McText text={entry.name} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(entry.value)}
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
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="size-4 text-muted-foreground" />
              月度活跃排行
            </CardTitle>
            <CardDescription>按公会月度活跃度统计前 10 名</CardDescription>
          </CardHeader>
          <CardContent>
            {overview === null ? (
              <Skeleton className="h-48 w-full" />
            ) : overview.monthProsperityRanking.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CrownIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无公会</EmptyTitle>
                  <EmptyDescription>还没有玩家创建公会。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">名次</TableHead>
                    <TableHead>公会</TableHead>
                    <TableHead className="text-right">月度活跃</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.monthProsperityRanking.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/guild/list/${entry.id}`)}
                    >
                      <TableCell>
                        <Badge variant={entry.rank <= 3 ? "default" : "outline"}>
                          {entry.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <McText text={entry.name} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(entry.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {overview?.applyStats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { title: "申请总数", value: overview.applyStats.total, suffix: "次" },
            {
              title: "已通过",
              value: overview.applyStats.approved,
              suffix: "次",
            },
            {
              title: "已拒绝",
              value: overview.applyStats.rejected,
              suffix: "次",
            },
            {
              title: "待审批",
              value: overview.applyStats.pending,
              suffix: "次",
            },
            {
              title: "已取消",
              value: overview.applyStats.cancelled,
              suffix: "次",
            },
          ].map((card) => (
            <Card key={card.title}>
              <CardHeader>
                <CardDescription>{card.title}</CardDescription>
                <CardTitle className="text-2xl">
                  {formatNumber(card.value)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {card.suffix}
                  </span>
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {overview?.recentPvpLogs && overview.recentPvpLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SwordsIcon className="size-4 text-muted-foreground" />
              最近公会战
            </CardTitle>
            <CardDescription>最近进行的公会战记录</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>公会</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>赛季</TableHead>
                  <TableHead>结果</TableHead>
                  <TableHead className="text-right">排名</TableHead>
                  <TableHead>开始时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.recentPvpLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      <McText text={log.guildName} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <McText text={log.type} />
                      </Badge>
                    </TableCell>
                    <TableCell>{log.season ?? "—"}</TableCell>
                    <TableCell>
                      {log.result === "win" ? (
                        <Badge>胜</Badge>
                      ) : log.result === "lose" ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          负
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.rank ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.startTime ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CrownIcon className="size-4 text-muted-foreground" />
            最新公会
          </CardTitle>
          <CardDescription>最近创建的公会，点击查看详情</CardDescription>
        </CardHeader>
        <CardContent>
          {overview === null ? (
            <Skeleton className="h-48 w-full" />
          ) : overview.latestGuilds.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CrownIcon />
                </EmptyMedia>
                <EmptyTitle>暂无公会</EmptyTitle>
                <EmptyDescription>还没有玩家创建公会。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>公会</TableHead>
                  <TableHead className="text-right">等级</TableHead>
                  <TableHead className="text-right">成员</TableHead>
                  <TableHead className="text-right">资金</TableHead>
                  <TableHead>会长</TableHead>
                  <TableHead>创建时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.latestGuilds.map((guild) => (
                  <TableRow
                    key={guild.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/guild/list/${guild.id}`)}
                  >
                    <TableCell className="font-medium">
                      <McText text={guild.name} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(guild.level)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(guild.memberTotal)}
                      {guild.memberMaxCount > 0 && (
                        <span className="text-muted-foreground">
                          /{formatNumber(guild.memberMaxCount)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(guild.money)}
                    </TableCell>
                    <TableCell>{guild.creator ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {guild.createTime ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
