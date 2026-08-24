"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  BookmarkIcon,
  CoinsIcon,
  FlameIcon,
  MapPinIcon,
  NavigationIcon,
  ShieldCheckIcon,
  StarIcon,
  UserIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { fetchJson, formatNumber } from "@/lib/common/format";
import { McText } from "@/lib/common/mc-text";
import type { WarpDetail } from "@/lib/plugins/playerwarp/types";

export default function WarpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [detail, setDetail] = useState<WarpDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<WarpDetail>(`/api/warp/${encodeURIComponent(id)}`)
      .then((data) => {
        setDetail(data);
        setNotFound(false);
      })
      .catch((err: Error) => {
        if (err.message.includes("404") || err.message.includes("未找到")) {
          setNotFound(true);
        } else {
          setError(err.message);
        }
      });
  }, [id]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>加载地标失败</AlertTitle>
        <AlertDescription>
          {error}
          <Link href="/warp/list" className="ml-2 underline">
            返回地标库
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (notFound) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MapPinIcon />
          </EmptyMedia>
          <EmptyTitle>未找到该地标</EmptyTitle>
          <EmptyDescription>
            <Link href="/warp/list" className="underline">
              返回地标库
            </Link>
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/warp/list" />}>
              地标库
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              <McText text={detail.name} />
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <MapPinIcon className="size-5 text-muted-foreground" />
            <span>
              <McText text={detail.name} />
            </span>
            {detail.top && <Badge>置顶</Badge>}
            {detail.display ? (
              <Badge variant="outline">已上架</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                未上架
              </Badge>
            )}
            {detail.type && (
              <Badge variant="secondary">
                <McText text={detail.type} />
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1">
              <UserIcon className="size-3.5" />
              {detail.ownerName}
            </span>
            {detail.creator && (
              <span className="flex items-center gap-1">
                <StarIcon className="size-3.5" />
                创建人 {detail.creator}
              </span>
            )}
            {detail.serverName && (
              <span className="flex items-center gap-1">
                <MapPinIcon className="size-3.5" />
                {detail.serverName}
                {detail.worldName ? ` · ${detail.worldName}` : ""}
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "价格",
            value: `${formatNumber(detail.price)} 币`,
            icon: <CoinsIcon className="size-4 text-muted-foreground" />,
          },
          {
            title: "热力值",
            value: formatNumber(detail.thermalValue),
            icon: <FlameIcon className="size-4 text-muted-foreground" />,
          },
          {
            title: "传送流量",
            value: `${formatNumber(detail.tpNumber)} 次`,
            icon: <NavigationIcon className="size-4 text-muted-foreground" />,
          },
          {
            title: "收藏数",
            value:
              detail.collectionCount === null
                ? "—"
                : formatNumber(detail.collectionCount),
            icon: <BookmarkIcon className="size-4 text-muted-foreground" />,
          },
        ].map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription className="flex items-center gap-1.5">
                {card.icon}
                {card.title}
              </CardDescription>
              <CardTitle className="text-2xl">{card.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>地标信息</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">描述</dt>
              <dd className="mt-0.5 break-all">
                <McText text={detail.description ?? "—"} />
              </dd>
            </div>
            {[
              ["服务器", detail.serverName ?? "—"],
              ["世界", detail.worldName ?? "—"],
              ["坐标", detail.warpLocation ?? "—"],
              ["创建时间", detail.createTime ?? "—"],
              ["到期时间", detail.expirationTime ?? "—"],
              [
                "评分",
                detail.likeCount === null
                  ? "—"
                  : `${detail.avgLike === null ? 0 : detail.avgLike.toFixed(1)} 分（${detail.likeCount} 人）`,
              ],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 break-all">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-muted-foreground" />
              白名单
            </CardTitle>
            <CardDescription>允许传送的玩家</CardDescription>
          </CardHeader>
          <CardContent>
            {detail.whitelist === null ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ShieldCheckIcon />
                  </EmptyMedia>
                  <EmptyTitle>无白名单表</EmptyTitle>
                  <EmptyDescription>
                    数据库中没有 warp_white_list 表。
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : detail.whitelist.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ShieldCheckIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无白名单</EmptyTitle>
                  <EmptyDescription>该地标还没有白名单玩家。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-wrap gap-2">
                {detail.whitelist.map((entry) => (
                  <Badge key={entry.playerName} variant="outline">
                    {entry.playerName}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <NavigationIcon className="size-4 text-muted-foreground" />
              最近传送
            </CardTitle>
            <CardDescription>最近 20 条传送记录</CardDescription>
          </CardHeader>
          <CardContent>
            {detail.recentTp === null ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <NavigationIcon />
                  </EmptyMedia>
                  <EmptyTitle>无传送表</EmptyTitle>
                  <EmptyDescription>
                    数据库中没有 warp_tp_player 表。
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : detail.recentTp.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <NavigationIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无传送</EmptyTitle>
                  <EmptyDescription>该地标还没有传送记录。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col">
                {detail.recentTp.map((record) => (
                  <button
                    key={`${record.playerUuid ?? record.playerName ?? ""}-${record.tpTime}`}
                    type="button"
                    className="flex cursor-pointer items-center justify-between gap-3 border-b py-2.5 text-left last:border-b-0 hover:bg-muted/50"
                    onClick={() => {
                      if (record.playerUuid) {
                        router.push(`/warp/players/${record.playerUuid}`);
                      }
                    }}
                  >
                    <span className="truncate font-medium">
                      {record.playerName ?? "未知玩家"}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {record.tpTime ?? "—"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
