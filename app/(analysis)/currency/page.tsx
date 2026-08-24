"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  CoinsIcon,
  HistoryIcon,
  WalletIcon,
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
import type {
  CurrencyLogEntry,
  CurrencyOverview,
} from "@/lib/plugins/playercurrency/types";

function ChangeValue({ value }: { value: number }) {
  return (
    <span
      className={
        value > 0
          ? "text-red-600"
          : value < 0
            ? "text-green-600"
            : "text-muted-foreground"
      }
    >
      {value > 0 ? "+" : ""}
      {formatNumber(value)}
    </span>
  );
}

export default function CurrencyDashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<CurrencyOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<CurrencyOverview>("/api/currency/overview")
      .then(setOverview)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "货币类型", value: overview?.totalTypes, suffix: "种" },
          { title: "持有玩家", value: overview?.holdingPlayers, suffix: "人" },
          {
            title: "流通总量",
            value: overview?.totalBalance,
            suffix: "（跨类型合计）",
          },
          { title: "变更记录", value: overview?.totalChanges, suffix: "笔" },
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CoinsIcon className="size-4 text-muted-foreground" />
            货币类型统计
          </CardTitle>
          <CardDescription>按货币类型统计持有玩家、流通余额与累计总量</CardDescription>
        </CardHeader>
        <CardContent>
          {overview === null ? (
            <Skeleton className="h-48 w-full" />
          ) : overview.typeStats.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CoinsIcon />
                </EmptyMedia>
                <EmptyTitle>暂无货币数据</EmptyTitle>
                <EmptyDescription>还没有玩家持有货币。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>货币类型</TableHead>
                  <TableHead className="text-right">持有玩家</TableHead>
                  <TableHead className="text-right">流通余额</TableHead>
                  <TableHead className="text-right">累计总量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.typeStats.map((stat) => (
                  <TableRow key={stat.type}>
                    <TableCell>
                      <Badge variant="outline">{stat.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(stat.players)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(stat.totalBalance)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatNumber(stat.totalEarned)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WalletIcon className="size-4 text-muted-foreground" />
              余额排行
            </CardTitle>
            <CardDescription>
              按各货币余额合计统计前 10 名，点击查看玩家详情
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview === null ? (
              <Skeleton className="h-48 w-full" />
            ) : overview.balanceRanking.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <WalletIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无玩家</EmptyTitle>
                  <EmptyDescription>还没有玩家持有货币。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">名次</TableHead>
                    <TableHead>玩家</TableHead>
                    <TableHead className="text-right">总余额</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.balanceRanking.map((entry) => (
                    <TableRow
                      key={entry.uuid}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/currency/players/${entry.uuid}`)
                      }
                    >
                      <TableCell>
                        <Badge
                          variant={entry.rank <= 3 ? "default" : "outline"}
                        >
                          {entry.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{entry.name}</TableCell>
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
              <HistoryIcon className="size-4 text-muted-foreground" />
              最近变更
            </CardTitle>
            <CardDescription>最近的货币变更记录，点击行查看玩家详情</CardDescription>
          </CardHeader>
          <CardContent>
            {overview === null ? (
              <Skeleton className="h-48 w-full" />
            ) : overview.recentLogs.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <HistoryIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无变更记录</EmptyTitle>
                  <EmptyDescription>还没有货币变更记录。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col">
                {overview.recentLogs.map((log: CurrencyLogEntry) => (
                  <button
                    key={log.id}
                    type="button"
                    className="flex cursor-pointer items-center justify-between gap-3 border-b py-2.5 text-left last:border-b-0 hover:bg-muted/50"
                    onClick={() =>
                      router.push(`/currency/players/${log.playerUuid}`)
                    }
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-2 truncate font-medium">
                        {log.playerName}
                        <Badge variant="outline">{log.type}</Badge>
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {log.reason ?? "—"}
                        {log.operatorName ? ` · ${log.operatorName}` : ""}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <ChangeValue value={log.changeValue} />
                      <span className="text-xs text-muted-foreground">
                        {log.operatorTime ?? "—"}
                      </span>
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  className="mt-2 cursor-pointer self-end text-sm text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => router.push("/currency/logs")}
                >
                  查看全部流水 →
                </button>
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
