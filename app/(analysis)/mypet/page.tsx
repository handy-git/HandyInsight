"use client";

import { useEffect, useState } from "react";
import { AlertCircleIcon, EggIcon } from "lucide-react";

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
import { fetchJson } from "@/lib/common/format";
import type {
  MypetOverview,
  MypetPlayerRankEntry,
  MypetTypeRankEntry,
} from "@/lib/plugins/mypet/types";

interface RankingData {
  types: MypetTypeRankEntry[];
  players: MypetPlayerRankEntry[];
}

export default function MypetDashboardPage() {
  const [overview, setOverview] = useState<MypetOverview | null>(null);
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchJson<MypetOverview>("/api/mypet/overview"),
      fetchJson<RankingData>("/api/mypet/ranking"),
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
          { title: "宠物总数量", value: overview?.totalPets, suffix: "只" },
          { title: "拥有宠物的玩家", value: overview?.totalPlayers, suffix: "人" },
          { title: "宠物类型数", value: overview?.totalTypes, suffix: "种" },
          { title: "世界组数", value: overview?.worldGroups, suffix: "个" },
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
            <CardTitle>宠物类型排行</CardTitle>
            <CardDescription>按宠物数量统计</CardDescription>
          </CardHeader>
          <CardContent>
            {ranking === null ? (
              <Skeleton className="h-48 w-full" />
            ) : ranking.types.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <EggIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无宠物数据</EmptyTitle>
                  <EmptyDescription>还没有玩家获得宠物。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">名次</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead className="text-right">宠物数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.types.map((entry) => (
                    <TableRow key={entry.type}>
                      <TableCell>
                        <Badge variant={entry.rank <= 3 ? "default" : "outline"}>
                          {entry.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{entry.type}</TableCell>
                      <TableCell className="text-right">{entry.pets} 只</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>宠物最多的玩家</CardTitle>
            <CardDescription>按持有宠物数统计</CardDescription>
          </CardHeader>
          <CardContent>
            {ranking === null ? (
              <Skeleton className="h-48 w-full" />
            ) : ranking.players.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <EggIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无玩家数据</EmptyTitle>
                  <EmptyDescription>还没有玩家获得宠物。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">名次</TableHead>
                    <TableHead>玩家</TableHead>
                    <TableHead className="text-right">宠物数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.players.map((entry) => (
                    <TableRow key={entry.uuid}>
                      <TableCell>
                        <Badge variant={entry.rank <= 3 ? "default" : "outline"}>
                          {entry.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell className="text-right">{entry.pets} 只</TableCell>
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
