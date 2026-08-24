"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, MedalIcon } from "lucide-react";

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
import { playerAvatarUrl } from "@/lib/common/avatar";
import { McText } from "@/lib/common/mc-text";
import { fetchJson, formatNumber } from "@/lib/common/format";
import type {
  TitleCoinRankEntry,
  TitleOverview,
  TitleRankEntry,
} from "@/lib/plugins/playertitle/types";

interface RankingData {
  titles: TitleRankEntry[];
  coins: TitleCoinRankEntry[];
}

export default function TitleDashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<TitleOverview | null>(null);
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchJson<TitleOverview>("/api/playertitle/overview"),
      fetchJson<RankingData>("/api/playertitle/ranking"),
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
          { title: "称号总数", value: overview?.totalTitles, suffix: "个" },
          { title: "持有称号玩家", value: overview?.totalPlayers, suffix: "人" },
          { title: "佩戴称号玩家", value: overview?.usingPlayers, suffix: "人" },
          {
            title: "称号币总量",
            value: overview ? formatNumber(overview.totalCoins) : undefined,
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
            <CardTitle>热门称号排行</CardTitle>
            <CardDescription>按持有玩家数统计</CardDescription>
          </CardHeader>
          <CardContent>
            {ranking === null ? (
              <Skeleton className="h-48 w-full" />
            ) : ranking.titles.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MedalIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无称号数据</EmptyTitle>
                  <EmptyDescription>还没有玩家获得称号。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">名次</TableHead>
                    <TableHead>称号</TableHead>
                    <TableHead className="text-right">持有玩家</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.titles.map((entry) => (
                    <TableRow key={`${entry.titleId}-${entry.titleName}`}>
                      <TableCell>
                        <Badge variant={entry.rank <= 3 ? "default" : "outline"}>
                          {entry.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <McText text={entry.titleName} />
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
            <CardTitle>称号币排行</CardTitle>
            <CardDescription>持有称号币最多的玩家</CardDescription>
          </CardHeader>
          <CardContent>
            {ranking === null ? (
              <Skeleton className="h-48 w-full" />
            ) : ranking.coins.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MedalIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无称号币数据</EmptyTitle>
                  <EmptyDescription>还没有玩家获得称号币。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">名次</TableHead>
                    <TableHead>玩家</TableHead>
                    <TableHead className="text-right">称号币</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.coins.map((entry) => (
                    <TableRow
                      key={entry.uuid ?? entry.name}
                      className={entry.uuid ? "cursor-pointer" : ""}
                      onClick={() =>
                        entry.uuid &&
                        router.push(`/title/players/${entry.uuid}`)
                      }
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
                        {formatNumber(entry.coins)}
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
