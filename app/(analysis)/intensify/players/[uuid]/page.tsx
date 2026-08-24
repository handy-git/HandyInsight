"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircleIcon, GemIcon, HammerIcon, UserXIcon } from "lucide-react";

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
import { playerAvatarUrl } from "@/lib/common/avatar";
import { fetchJson } from "@/lib/common/format";
import { McText } from "@/lib/common/mc-text";
import type { IntensifyPlayerDetail } from "@/lib/plugins/playerintensify/types";

function rateText(rate: number | null): string {
  return rate === null ? "—" : `${rate}%`;
}

export default function IntensifyPlayerDetailPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const [detail, setDetail] = useState<IntensifyPlayerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<IntensifyPlayerDetail>(`/api/intensify/players/${uuid}`)
      .then(setDetail)
      .catch((err: Error) => setError(err.message));
  }, [uuid]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>加载强化详情失败</AlertTitle>
        <AlertDescription>
          {error}
          <Link href="/intensify/players" className="ml-2 underline">
            返回强化玩家
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
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/intensify/players" />}>
              强化玩家
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
            {detail.name}
            {detail.maxLevel > 0 && (
              <Badge>最高 +{detail.maxLevel}</Badge>
            )}
          </CardTitle>
          <CardDescription className="break-all">{detail.uuid}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "强化总次数", value: `${detail.totalAttempts} 次` },
          { title: "成功次数", value: `${detail.succeedNum} 次` },
          { title: "失败次数", value: `${detail.failureNum} 次` },
          { title: "成功率", value: rateText(detail.successRate) },
        ].map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-2xl">{card.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "单次超 10", value: `${detail.tenNum} 次` },
          { title: "掉级次数", value: `${detail.levelOffNum} 次` },
          { title: "消失次数", value: `${detail.vanishNum} 次` },
          { title: "最高等级", value: `+${detail.maxLevel}` },
        ].map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-2xl">{card.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HammerIcon className="size-4 text-muted-foreground" />
            最高强化装备
          </CardTitle>
          <CardDescription>该玩家强化到的最高等级装备</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.maxLevelName ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <GemIcon className="size-8 shrink-0 text-muted-foreground" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">装备名称</span>
                  <span className="text-base font-medium">
                    <McText text={detail.maxLevelName} />
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <GemIcon className="size-8 shrink-0 text-muted-foreground" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">装备材质</span>
                  <span className="text-base font-medium">
                    {detail.materialName ?? "—"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UserXIcon />
                </EmptyMedia>
                <EmptyTitle>暂无强化装备</EmptyTitle>
                <EmptyDescription>该玩家还没有强化过任何装备。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </>
  );
}
