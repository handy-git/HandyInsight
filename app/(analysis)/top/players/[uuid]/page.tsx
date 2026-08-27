"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircleIcon, GiftIcon, TrophyIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { McMessage } from "@/lib/common/mc-text";
import { fetchJson, formatNumber } from "@/lib/common/format";
import type { TopPlayerDetail } from "@/lib/plugins/playertop/types";

/** 发奖状态展示：约定 1 为已发放，0 为待处理。 */
function StatusBadge({ status }: { status: number | null }) {
  if (status === 1) return <Badge>已发放</Badge>;
  if (status === 0) return <Badge variant="secondary">待处理</Badge>;
  return <span className="text-muted-foreground">—</span>;
}

export default function TopPlayerDetailPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const [detail, setDetail] = useState<TopPlayerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<TopPlayerDetail>(
      `/api/top/players/${encodeURIComponent(uuid)}`,
    )
      .then(setDetail)
      .catch((err: Error) => setError(err.message));
  }, [uuid]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>加载排行详情失败</AlertTitle>
        <AlertDescription>
          {error}
          <Link href="/top/ranking" className="ml-2 underline">
            返回排行榜
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const bestRank = detail.ranks.length > 0 ? detail.ranks[0] : null;
  const lastUpdateAt =
    detail.ranks.length > 0 ? detail.ranks[0].updateAt : null;

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/top/ranking" />}>
              排行榜
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{detail.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarImage
                src={playerAvatarUrl(detail.name, 64)}
                alt={detail.name}
              />
              <AvatarFallback>
                {detail.name.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="flex flex-col gap-1">
              <span className="flex items-center gap-2">
                {detail.name}
                <Badge>
                  <TrophyIcon data-icon="inline-start" />
                  上榜 {detail.ranks.length} 个排行
                </Badge>
              </span>
              <span className="break-all text-xs font-normal text-muted-foreground">
                {detail.uuid}
              </span>
            </span>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "上榜排行",
            value: `${detail.ranks.length} 个`,
          },
          {
            title: "最佳排名",
            value: bestRank ? `第 ${bestRank.rank} 名` : "—",
          },
          {
            title: "最佳排行",
            value: bestRank ? bestRank.papi : "—",
          },
          {
            title: "最近更新",
            value: lastUpdateAt ?? "—",
          },
        ].map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle
                className={
                  card.title === "最近更新" || card.title === "最佳排行"
                    ? "text-lg font-mono break-all"
                    : "text-2xl"
                }
              >
                {card.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrophyIcon className="size-4 text-muted-foreground" />
            上榜记录
          </CardTitle>
          <CardDescription>该玩家在各排行榜的当前名次与值</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.ranks.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TrophyIcon />
                </EmptyMedia>
                <EmptyTitle>暂未上榜</EmptyTitle>
                <EmptyDescription>该玩家还没有上榜记录。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>排行类型</TableHead>
                  <TableHead className="w-20 text-right">名次</TableHead>
                  <TableHead className="text-right">值</TableHead>
                  <TableHead className="text-right">更新时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.ranks.map((rank) => (
                  <TableRow key={rank.papi}>
                    <TableCell className="max-w-64 font-mono text-xs whitespace-normal break-all">
                      {rank.papi}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={rank.rank <= 3 ? "default" : "outline"}>
                        第 {rank.rank} 名
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(rank.value)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {rank.updateAt ?? "—"}
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
            获奖记录
          </CardTitle>
          <CardDescription>该玩家最近 50 条排行奖励发放记录</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.rewards.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GiftIcon />
                </EmptyMedia>
                <EmptyTitle>暂无获奖记录</EmptyTitle>
                <EmptyDescription>该玩家还没有获得过排行奖励。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>排行类型</TableHead>
                  <TableHead className="text-right">名次</TableHead>
                  <TableHead>奖励类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>消息</TableHead>
                  <TableHead>命令</TableHead>
                  <TableHead className="text-right">时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.rewards.map((reward) => (
                  <TableRow key={reward.id}>
                    <TableCell className="max-w-64 font-mono text-xs whitespace-normal break-all">
                      {reward.papi}
                    </TableCell>
                    <TableCell className="text-right">
                      {reward.rank === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Badge variant={reward.rank <= 3 ? "default" : "outline"}>
                          第 {reward.rank} 名
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {reward.type ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={reward.status} />
                    </TableCell>
                    <TableCell className="max-w-sm">
                      <McMessage text={reward.message} />
                    </TableCell>
                    <TableCell className="max-w-sm">
                      <McMessage text={reward.command} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {reward.createTime ?? "—"}
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
