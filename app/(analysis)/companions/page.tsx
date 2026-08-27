"use client";

import { useEffect, useState } from "react";
import { AlertCircleIcon, PawPrintIcon } from "lucide-react";

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
  CompanionsEquipmentEntry,
  CompanionsOverview,
  CompanionsRankEntry,
} from "@/lib/plugins/companions/types";

interface RankingData {
  companions: CompanionsRankEntry[];
  equipments: CompanionsEquipmentEntry[];
}

function formatCoins(coins: number): string {
  return formatNumber(coins);
}

export default function CompanionsDashboardPage() {
  const [overview, setOverview] = useState<CompanionsOverview | null>(null);
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchJson<CompanionsOverview>("/api/companions/overview"),
      fetchJson<RankingData>("/api/companions/ranking"),
    ])
      .then(([overviewData, rankingData]) => {
        setOverview(overviewData);
        setRanking(rankingData);
      })
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

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "拥有小精灵的玩家", value: overview?.totalPlayers, suffix: "人" },
          { title: "当前出战小精灵", value: overview?.activePlayers, suffix: "只" },
          { title: "小精灵总数量", value: overview?.totalCompanions, suffix: "只" },
          {
            title: "小精灵货币总量",
            value: overview ? formatCoins(overview.totalCoins) : undefined,
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>热门小精灵排行</CardTitle>
            <CardDescription>按持有玩家数统计</CardDescription>
          </CardHeader>
          <CardContent>
            {ranking === null ? (
              <Skeleton className="h-48 w-full" />
            ) : ranking.companions.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <PawPrintIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无小精灵数据</EmptyTitle>
                  <EmptyDescription>还没有玩家获得小精灵。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">名次</TableHead>
                    <TableHead>小精灵</TableHead>
                    <TableHead className="text-right">持有玩家</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.companions.map((entry) => (
                    <TableRow key={entry.companion}>
                      <TableCell>
                        <Badge variant={entry.rank <= 3 ? "default" : "outline"}>
                          {entry.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.companion}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.players} 人
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
            <CardTitle>装备使用排行</CardTitle>
            <CardDescription>按使用玩家数统计</CardDescription>
          </CardHeader>
          <CardContent>
            {ranking === null ? (
              <Skeleton className="h-48 w-full" />
            ) : ranking.equipments.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <PawPrintIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无装备数据</EmptyTitle>
                  <EmptyDescription>还没有玩家给小精灵配备装备。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>装备</TableHead>
                    <TableHead className="text-right">使用玩家</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.equipments.map((entry) => (
                    <TableRow key={entry.equipment}>
                      <TableCell className="font-medium">
                        {entry.equipment}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.players} 人
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
