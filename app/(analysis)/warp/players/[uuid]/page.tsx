"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  BookmarkIcon,
  FlameIcon,
  MapPinIcon,
  NavigationIcon,
  RadioIcon,
} from "lucide-react";

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
import { fetchJson, formatNumber } from "@/lib/common/format";
import { McText } from "@/lib/common/mc-text";
import type {
  WarpCollectionEntry,
  WarpEntry,
  WarpPlayerDetail,
} from "@/lib/plugins/playerwarp/types";

function WarpRow({ warp }: { warp: WarpEntry }) {
  const router = useRouter();
  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => router.push(`/warp/list/${warp.id}`)}
    >
      <TableCell className="font-medium">
        <span className="flex items-center gap-2">
          <McText text={warp.name} />
          {warp.top && <Badge>置顶</Badge>}
          {!warp.display && (
            <Badge variant="outline" className="text-muted-foreground">
              未上架
            </Badge>
          )}
        </span>
      </TableCell>
      <TableCell>
      {warp.type ? (
        <Badge variant="outline">
          <McText text={warp.type} />
        </Badge>
      ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {warp.serverName ?? (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <span className="flex items-center justify-end gap-1">
          <FlameIcon className="size-3.5 text-muted-foreground" />
          {formatNumber(warp.thermalValue)}
        </span>
      </TableCell>
      <TableCell className="text-right">{formatNumber(warp.tpNumber)}</TableCell>
      <TableCell>{warp.createTime ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground">
        {warp.expirationTime ?? "—"}
      </TableCell>
    </TableRow>
  );
}

export default function WarpPlayerDetailPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const router = useRouter();
  const [detail, setDetail] = useState<WarpPlayerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<WarpPlayerDetail>(
      `/api/warp/players/${encodeURIComponent(uuid)}`,
    )
      .then(setDetail)
      .catch((err: Error) => setError(err.message));
  }, [uuid]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>加载地标详情失败</AlertTitle>
        <AlertDescription>
          {error}
          <Link href="/warp/players" className="ml-2 underline">
            返回地标玩家
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

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/warp/players" />}>
              地标玩家
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
                  <MapPinIcon data-icon="inline-start" />
                  {detail.warps.length} 个地标
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
          { title: "创建地标", value: `${detail.warps.length} 个` },
          {
            title: "上架中",
            value: `${detail.warps.filter((warp) => warp.display).length} 个`,
          },
          {
            title: "地标总流量",
            value: `${formatNumber(
              detail.warps.reduce((sum, warp) => sum + warp.tpNumber, 0),
            )} 次`,
          },
          {
            title: "地标总热力",
            value: `${formatNumber(
              detail.warps.reduce((sum, warp) => sum + warp.thermalValue, 0),
            )}`,
          },
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
            <MapPinIcon className="size-4 text-muted-foreground" />
            创建的地标
          </CardTitle>
          <CardDescription>该玩家创建的地标，点击行查看详情</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.warps.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MapPinIcon />
                </EmptyMedia>
                <EmptyTitle>暂无地标</EmptyTitle>
                <EmptyDescription>该玩家还没有创建地标。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>地标</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>服务器</TableHead>
                  <TableHead className="text-right">热力</TableHead>
                  <TableHead className="text-right">流量</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>到期时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.warps.map((warp) => (
                  <WarpRow key={warp.id} warp={warp} />
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
              <BookmarkIcon className="size-4 text-muted-foreground" />
              收藏的地标
            </CardTitle>
            <CardDescription>该玩家收藏的地标</CardDescription>
          </CardHeader>
          <CardContent>
            {detail.collections === null ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BookmarkIcon />
                  </EmptyMedia>
                  <EmptyTitle>无收藏表</EmptyTitle>
                  <EmptyDescription>
                    数据库中没有 warp_collection 表。
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : detail.collections.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BookmarkIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无收藏</EmptyTitle>
                  <EmptyDescription>该玩家还没有收藏地标。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <CollectionTable
                collections={detail.collections}
                onOpen={(warpId) => router.push(`/warp/list/${warpId}`)}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <NavigationIcon className="size-4 text-muted-foreground" />
              最近传送
            </CardTitle>
            <CardDescription>该玩家最近传送过的地标</CardDescription>
          </CardHeader>
          <CardContent>
            {detail.tpRecords === null ? (
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
            ) : detail.tpRecords.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <NavigationIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无传送</EmptyTitle>
                  <EmptyDescription>该玩家还没有传送记录。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col">
                {detail.tpRecords.map((record) => (
                  <button
                    key={`${record.warpId}-${record.tpTime}`}
                    type="button"
                    className="flex cursor-pointer items-center justify-between gap-3 border-b py-2.5 text-left last:border-b-0 hover:bg-muted/50"
                    onClick={() => router.push(`/warp/list/${record.warpId}`)}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">
                        <McText text={record.name} />
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {record.serverName ?? "—"}
                      </span>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RadioIcon className="size-4 text-muted-foreground" />
            玩家渠道
          </CardTitle>
          <CardDescription>该玩家在各地图的传送渠道</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.channels === null ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RadioIcon />
                </EmptyMedia>
                <EmptyTitle>无渠道表</EmptyTitle>
                <EmptyDescription>
                  数据库中没有 warp_channel 表。
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : detail.channels.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RadioIcon />
                </EmptyMedia>
                <EmptyTitle>暂无渠道</EmptyTitle>
                <EmptyDescription>该玩家还没有开通渠道。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-wrap gap-2">
              {detail.channels.map((channel) => (
                <Badge key={channel.serverName} variant="outline" className="gap-1.5 py-1.5">
                  {channel.serverName}
                  {channel.warpName && (
                    <span className="text-muted-foreground">
                      <McText text={channel.warpName} />
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function CollectionTable({
  collections,
  onOpen,
}: {
  collections: WarpCollectionEntry[];
  onOpen: (warpId: number) => void;
}) {
  return (
    <div className="flex flex-col">
      {collections.map((collection) => (
        <button
          key={collection.warpId}
          type="button"
          className="flex cursor-pointer items-center justify-between gap-3 border-b py-2.5 text-left last:border-b-0 hover:bg-muted/50"
          onClick={() => onOpen(collection.warpId)}
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">
              <span className="flex items-center gap-2">
                <McText text={collection.name} />
                {!collection.display && (
                  <Badge variant="outline" className="text-muted-foreground">
                    未上架
                  </Badge>
                )}
              </span>
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {collection.serverName ?? "—"}
            </span>
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {collection.createTime ?? "—"}
          </span>
        </button>
      ))}
    </div>
  );
}
