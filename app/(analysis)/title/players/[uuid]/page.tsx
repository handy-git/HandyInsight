"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircleIcon, MedalIcon } from "lucide-react";

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
import { McText } from "@/lib/common/mc-text";
import { fetchJson, formatNumber } from "@/lib/common/format";
import type { TitlePlayerDetail } from "@/lib/plugins/playertitle/types";

export default function TitlePlayerDetailPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const [detail, setDetail] = useState<TitlePlayerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<TitlePlayerDetail>(
      `/api/playertitle/players/${encodeURIComponent(uuid)}`,
    )
      .then(setDetail)
      .catch((err: Error) => setError(err.message));
  }, [uuid]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>加载称号详情失败</AlertTitle>
        <AlertDescription>
          {error}
          <Link href="/title/players" className="ml-2 underline">
            返回称号玩家
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

  const expiringCount = detail.titles.filter(
    (title) => !title.expired && title.expiringSoon,
  ).length;

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/title/players" />}>
              称号玩家
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
                {detail.usingTitle && (
                  <Badge>
                    <MedalIcon data-icon="inline-start" />
                    <McText text={detail.usingTitle} />
                  </Badge>
                )}
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
          { title: "持有称号", value: `${detail.titles.length} 个` },
          {
            title: "称号币",
            value:
              detail.coins === null
                ? "—"
                : formatNumber(detail.coins),
          },
          {
            title: "佩戴中",
            value: detail.usingTitle ?? "未佩戴",
          },
          { title: "7 天内到期", value: `${expiringCount} 个` },
        ].map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-lg break-all">{card.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>持有称号</CardTitle>
          <CardDescription>按佩戴状态与到期时间排序</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.titles.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MedalIcon />
                </EmptyMedia>
                <EmptyTitle>暂无称号</EmptyTitle>
                <EmptyDescription>该玩家只持有称号币，还没有称号。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>称号</TableHead>
                  <TableHead>到期时间</TableHead>
                  <TableHead>启用功能</TableHead>
                  <TableHead className="text-right">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.titles.map((title, index) => (
                  <TableRow key={`${title.titleId}-${index}`}>
                    <TableCell className="font-medium">
                      <McText text={title.titleName} />
                    </TableCell>
                    <TableCell>{title.expirationTime}</TableCell>
                    <TableCell>
                      <span className="flex flex-wrap gap-1">
                        {title.isUse && <Badge>展示</Badge>}
                        {title.isUseBuff && <Badge variant="outline">属性</Badge>}
                        {title.isUseParticle && (
                          <Badge variant="outline">粒子</Badge>
                        )}
                        {!title.isUse &&
                          !title.isUseBuff &&
                          !title.isUseParticle && (
                            <span className="text-muted-foreground">
                              未启用
                            </span>
                          )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {title.expired ? (
                        <Badge variant="destructive">已过期</Badge>
                      ) : title.expiringSoon ? (
                        <Badge variant="outline">即将到期</Badge>
                      ) : (
                        <Badge variant="outline">有效</Badge>
                      )}
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
