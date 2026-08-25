"use client";

import { useEffect, useState } from "react";
import { AlertCircleIcon, ClipboardListIcon, CoinsIcon } from "lucide-react";

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
import { formatDateTime, fetchJson, formatNumber } from "@/lib/common/format";
import { McText } from "@/lib/common/mc-text";
import { taskRarityLabel, type TaskOverview } from "@/lib/plugins/playertask/types";
import { cn } from "@/lib/utils";

function formatCoins(coins: number): string {
  return formatNumber(coins);
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export default function TaskDashboardPage() {
  const [overview, setOverview] = useState<TaskOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<TaskOverview>("/api/task/overview")
      .then(setOverview)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "任务币玩家", value: overview?.coinPlayers, suffix: "人" },
          {
            title: "任务币总量",
            value:
              overview === null ? undefined : formatCoins(overview.totalCoins),
          },
          { title: "今日完成任务", value: overview?.todayCompleted, suffix: "个" },
          { title: "近 7 天活跃玩家", value: overview?.activePlayers, suffix: "人" },
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>任务完成分布</CardTitle>
            <CardDescription>每日 / NPC / 卷轴任务的完成情况</CardDescription>
          </CardHeader>
          <CardContent>
            {overview === null ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="flex flex-col gap-4">
                {overview.typeStats.map((stat) => {
                  const rate =
                    stat.total === 0 ? 0 : (stat.completed / stat.total) * 100;
                  return (
                    <div key={stat.category} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{stat.label}</span>
                        <span className="text-muted-foreground">
                          {stat.completed} / {stat.total} 完成
                        </span>
                      </div>
                      <Progress value={rate} />
                    </div>
                  );
                })}
                {overview.typeStats.every((stat) => stat.total === 0) && (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <ClipboardListIcon />
                      </EmptyMedia>
                      <EmptyTitle>暂无任务数据</EmptyTitle>
                      <EmptyDescription>
                        还没有玩家领取任务。
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>卷轴稀有度分布</CardTitle>
            <CardDescription>卷轴任务的稀有度占比</CardDescription>
          </CardHeader>
          <CardContent>
            {overview === null ? (
              <Skeleton className="h-48 w-full" />
            ) : overview.rarityStats.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ClipboardListIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无卷轴数据</EmptyTitle>
                  <EmptyDescription>还没有玩家获得卷轴任务。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-wrap gap-2">
                {overview.rarityStats.map((stat) => (
                  <Badge key={stat.rarity} variant="outline" className="gap-1.5 py-1.5">
                    {taskRarityLabel(stat.rarity)}
                    <span className="text-muted-foreground">{stat.total} 个</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CoinsIcon className="size-4 text-muted-foreground" />
              任务币排行
            </CardTitle>
            <CardDescription>按任务币余额统计前 10 名</CardDescription>
          </CardHeader>
          <CardContent>
            {overview === null ? (
              <Skeleton className="h-48 w-full" />
            ) : overview.coinRanking.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CoinsIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无任务币数据</EmptyTitle>
                  <EmptyDescription>还没有玩家获得任务币。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">名次</TableHead>
                    <TableHead>玩家</TableHead>
                    <TableHead className="text-right">任务币</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.coinRanking.map((entry) => (
                    <TableRow key={entry.uuid}>
                      <TableCell>
                        <Badge variant={entry.rank <= 3 ? "default" : "outline"}>
                          {entry.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell className="text-right">
                        {formatCoins(entry.coins)}
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
            <CardTitle>最近任务动态</CardTitle>
            <CardDescription>每日与 NPC 任务，按时间倒序</CardDescription>
          </CardHeader>
          <CardContent>
            {overview === null ? (
              <Skeleton className="h-48 w-full" />
            ) : overview.recentTasks.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ClipboardListIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无任务动态</EmptyTitle>
                  <EmptyDescription>还没有玩家完成任务。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col">
                {overview.recentTasks.map((entry, index) => (
                  <div
                    key={`${entry.taskDate}-${entry.uuid}-${index}`}
                    className={cn(
                      "flex items-center justify-between gap-3 py-2 text-sm",
                      index > 0 && "border-t",
                    )}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">
                        <McText text={entry.taskName} />
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {entry.name}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge variant={entry.completed ? "default" : "outline"}>
                        {entry.completed ? "已完成" : "进行中"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(entry.taskDate) || "—"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>数据加载失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
