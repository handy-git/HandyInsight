"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  BookmarkIcon,
  FlameIcon,
  MapPinIcon,
  NavigationIcon,
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
import { McText } from "@/lib/common/mc-text";
import type { WarpOverview } from "@/lib/plugins/playerwarp/types";

export default function WarpDashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<WarpOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<WarpOverview>("/api/warp/overview")
      .then(setOverview)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "地标总数", value: overview?.totalWarps, suffix: "个" },
          {
            title: "上架地标",
            value: overview?.displayedWarps,
            suffix: "个",
          },
          { title: "总传送流量", value: overview?.totalTp, suffix: "次" },
          {
            title: "玩家收藏",
            value: overview?.totalCollections,
            suffix: "次",
          },
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlameIcon className="size-4 text-muted-foreground" />
              热力值排行
            </CardTitle>
            <CardDescription>按地标热力值统计前 10 名</CardDescription>
          </CardHeader>
          <CardContent>
            {overview === null ? (
              <Skeleton className="h-48 w-full" />
            ) : overview.thermalRanking.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FlameIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无地标</EmptyTitle>
                  <EmptyDescription>还没有玩家创建地标。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">名次</TableHead>
                    <TableHead>地标</TableHead>
                    <TableHead className="text-right">热力值</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.thermalRanking.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/warp/list/${entry.id}`)}
                    >
                      <TableCell>
                        <Badge variant={entry.rank <= 3 ? "default" : "outline"}>
                          {entry.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <McText text={entry.name} />
                      </TableCell>
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
              <NavigationIcon className="size-4 text-muted-foreground" />
              传送流量排行
            </CardTitle>
            <CardDescription>按地标累计传送次数统计前 10 名</CardDescription>
          </CardHeader>
          <CardContent>
            {overview === null ? (
              <Skeleton className="h-48 w-full" />
            ) : overview.tpRanking.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <NavigationIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无地标</EmptyTitle>
                  <EmptyDescription>还没有玩家创建地标。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">名次</TableHead>
                    <TableHead>地标</TableHead>
                    <TableHead className="text-right">传送次数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.tpRanking.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/warp/list/${entry.id}`)}
                    >
                      <TableCell>
                        <Badge variant={entry.rank <= 3 ? "default" : "outline"}>
                          {entry.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <McText text={entry.name} />
                      </TableCell>
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
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>地标类型分布</CardTitle>
            <CardDescription>按地标类型统计</CardDescription>
          </CardHeader>
          <CardContent>
            {overview === null ? (
              <Skeleton className="h-48 w-full" />
            ) : overview.typeStats.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MapPinIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无类型数据</EmptyTitle>
                  <EmptyDescription>还没有玩家创建地标。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-wrap gap-2">
                {overview.typeStats.map((stat) => (
                  <Badge key={stat.key} variant="outline" className="gap-1.5 py-1.5">
                    <McText text={stat.key} />
                    <span className="text-muted-foreground">{stat.total} 个</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>服务器分布</CardTitle>
            <CardDescription>按地标所在服务器统计</CardDescription>
          </CardHeader>
          <CardContent>
            {overview === null ? (
              <Skeleton className="h-48 w-full" />
            ) : overview.serverStats.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MapPinIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无服务器数据</EmptyTitle>
                  <EmptyDescription>还没有玩家创建地标。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-wrap gap-2">
                {overview.serverStats.map((stat) => (
                  <Badge key={stat.key} variant="outline" className="gap-1.5 py-1.5">
                    {stat.key}
                    <span className="text-muted-foreground">{stat.total} 个</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookmarkIcon className="size-4 text-muted-foreground" />
            最新地标
          </CardTitle>
          <CardDescription>最近创建的地标，点击查看详情</CardDescription>
        </CardHeader>
        <CardContent>
          {overview === null ? (
            <Skeleton className="h-48 w-full" />
          ) : overview.latestWarps.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MapPinIcon />
                </EmptyMedia>
                <EmptyTitle>暂无地标</EmptyTitle>
                <EmptyDescription>还没有玩家创建地标。</EmptyDescription>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.latestWarps.map((warp) => (
                  <TableRow
                    key={warp.id}
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
                    <TableCell className="text-right">
                      {formatNumber(warp.tpNumber)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {warp.createTime ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
