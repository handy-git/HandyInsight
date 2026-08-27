"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  GiftIcon,
  TrophyIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { fetchJson, formatNumber } from "@/lib/common/format";
import type { TopOverview } from "@/lib/plugins/playertop/types";

export default function TopDashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<TopOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<TopOverview>("/api/top/overview")
      .then(setOverview)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "排行类型", value: overview?.totalPapIs, suffix: "个" },
          { title: "上榜玩家", value: overview?.totalPlayers, suffix: "人" },
          { title: "排行记录", value: overview?.totalRecords, suffix: "条" },
          { title: "最近更新", value: overview?.lastUpdateAt, suffix: "" },
        ].map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle
                className={card.title === "最近更新" ? "text-base" : "text-2xl"}
              >
                {overview === null ? (
                  <Skeleton className="h-8 w-24" />
                ) : card.value === null || card.value === undefined ? (
                  "—"
                ) : (
                  <>
                    {card.title === "最近更新"
                      ? card.value
                      : formatNumber(Number(card.value))}
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrophyIcon className="size-4 text-muted-foreground" />
            排行榜概览
          </CardTitle>
          <CardDescription>
            各 PAPI 变量的上榜情况，点击行查看完整排行榜
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overview === null ? (
            <Skeleton className="h-48 w-full" />
          ) : overview.papiStats.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TrophyIcon />
                </EmptyMedia>
                <EmptyTitle>暂无排行数据</EmptyTitle>
                <EmptyDescription>还没有玩家上榜。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>排行类型</TableHead>
                  <TableHead className="text-right">上榜玩家</TableHead>
                  <TableHead className="text-right">最高值</TableHead>
                  <TableHead className="text-right">最近更新</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.papiStats.map((stat) => (
                  <TableRow
                    key={stat.papi}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/top/ranking?papi=${encodeURIComponent(stat.papi)}`)
                    }
                  >
                    <TableCell className="max-w-64 font-mono text-xs whitespace-normal break-all">
                      {stat.papi}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(stat.players)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(stat.maxValue)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {stat.lastUpdateAt ?? "—"}
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
            <GiftIcon className="size-4 text-muted-foreground" />
            最近发奖
          </CardTitle>
          <CardDescription>最近的排行奖励发放记录，点击查看玩家排行详情</CardDescription>
        </CardHeader>
        <CardContent>
          {overview === null ? (
            <Skeleton className="h-40 w-full" />
          ) : overview.recentRewards.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GiftIcon />
                </EmptyMedia>
                <EmptyTitle>暂无发奖记录</EmptyTitle>
                <EmptyDescription>还没有发放过排行奖励。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col">
              {overview.recentRewards.map((reward) => (
                <button
                  key={reward.id}
                  type="button"
                  className="flex cursor-pointer items-center justify-between gap-3 border-b py-2.5 text-left last:border-b-0 hover:bg-muted/50"
                  onClick={() =>
                    router.push(`/top/players/${reward.playerUuid}`)
                  }
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      {reward.playerName}
                      <span className="max-w-full font-mono text-xs font-normal text-muted-foreground break-all">
                        {reward.papi}
                      </span>
                      {reward.rank !== null && (
                        <Badge variant={reward.rank <= 3 ? "default" : "outline"}>
                          第 {reward.rank} 名
                        </Badge>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {reward.type ?? "—"}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {reward.status === 1 ? (
                      <Badge>已发放</Badge>
                    ) : reward.status === 0 ? (
                      <Badge variant="secondary">待处理</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {reward.createTime ?? "—"}
                    </span>
                  </span>
                </button>
              ))}
              <Button
                variant="link"
                size="sm"
                className="mt-2 h-auto self-end px-0 text-muted-foreground"
                onClick={() => router.push("/top/logs")}
              >
                查看全部发奖记录 →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
