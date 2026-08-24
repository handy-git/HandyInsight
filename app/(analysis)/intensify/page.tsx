"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { fetchJson } from "@/lib/common/format";
import { McText } from "@/lib/common/mc-text";
import type {
  IntensifyOverview,
  IntensifyRankingEntry,
  IntensifyRankingType,
} from "@/lib/plugins/playerintensify/types";

function rateText(rate: number | null): string {
  return rate === null ? "—" : `${rate}%`;
}

export default function IntensifyDashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<IntensifyOverview | null>(null);
  const [type, setType] = useState<IntensifyRankingType>("attempts");
  const [ranking, setRanking] = useState<IntensifyRankingEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<IntensifyOverview>("/api/intensify/overview")
      .then(setOverview)
      .catch((err: Error) => setError(err.message));
  }, []);

  const loadRanking = useCallback((nextType: IntensifyRankingType) => {
    fetchJson<IntensifyRankingEntry[]>(
      `/api/intensify/ranking?type=${nextType}`,
    )
      .then(setRanking)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    loadRanking(type);
  }, [type, loadRanking]);

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
          {
            title: "强化玩家",
            value: overview?.totalPlayers,
            suffix: "人",
          },
          {
            title: "强化总次数",
            value: overview?.totalAttempts,
            suffix: "次",
          },
          {
            title: "成功总次数",
            value: overview?.totalSuccess,
            suffix: "次",
          },
          {
            title: "全服成功率",
            value:
              overview === null || overview.successRate === null
                ? undefined
                : `${overview.successRate}%`,
            suffix: "",
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
            <CardTitle>强化排行</CardTitle>
            <CardDescription>点击玩家查看强化详情</CardDescription>
          </div>
          <ToggleGroup
            value={[type]}
            onValueChange={(values) => {
              const next = values[0] as IntensifyRankingType | undefined;
              if (next) setType(next);
            }}
          >
            <ToggleGroupItem value="attempts">强化次数</ToggleGroupItem>
            <ToggleGroupItem value="level">最高等级</ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent>
          {ranking === null ? (
            <Skeleton className="h-64 w-full" />
          ) : ranking.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UserXIcon />
                </EmptyMedia>
                <EmptyTitle>暂无强化记录</EmptyTitle>
                <EmptyDescription>还没有任何玩家进行过强化。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-right">名次</TableHead>
                  <TableHead>玩家</TableHead>
                  <TableHead className="text-right">强化次数</TableHead>
                  <TableHead className="text-right">成功率</TableHead>
                  <TableHead className="text-right">最高等级</TableHead>
                  <TableHead>最高装备</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((entry) => (
                  <TableRow
                    key={entry.uuid}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/intensify/players/${entry.uuid}`)
                    }
                  >
                    <TableCell className="text-right font-medium">
                      {entry.rank}
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
                        {type === "level" && entry.maxLevel >= 20 && (
                          <Badge>+{entry.maxLevel}</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.value} 次
                    </TableCell>
                    <TableCell className="text-right">
                      {rateText(entry.successRate)}
                    </TableCell>
                    <TableCell className="text-right">
                      +{entry.maxLevel}
                    </TableCell>
                    <TableCell>
                      {entry.maxLevelName ? (
                        <McText text={entry.maxLevelName} />
                      ) : (
                        "—"
                      )}
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
          <CardTitle>全服强化消耗</CardTitle>
          <CardDescription>失败、掉级与装备消失的累计次数</CardDescription>
        </CardHeader>
        <CardContent>
          {overview === null ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="grid grid-cols-3 divide-x">
              {[
                { title: "失败", value: overview.totalFailure, unit: "次" },
                { title: "掉级", value: overview.totalLevelOff, unit: "次" },
                { title: "消失", value: overview.totalVanish, unit: "次" },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col items-center gap-1 px-4"
                >
                  <span className="text-2xl font-semibold text-foreground">
                    {item.value}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    累计{item.title} {item.value} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
