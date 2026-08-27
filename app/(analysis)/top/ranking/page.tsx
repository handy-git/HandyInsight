"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircleIcon, TrophyIcon } from "lucide-react";

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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import type { Paginated } from "@/lib/common/types";
import type {
  TopOverview,
  TopRankEntry,
} from "@/lib/plugins/playertop/types";

function RankingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [overview, setOverview] = useState<TopOverview | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<TopRankEntry> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<TopOverview>("/api/top/overview")
      .then(setOverview)
      .catch((err: Error) => setError(err.message));
  }, []);

  // 当前排行：URL 中的 papi 存在则优先，否则取第一个（派生值，不单独存 state）
  const papis = (overview?.papiStats ?? []).map((stat) => stat.papi);
  const urlPapi = searchParams.get("papi");
  const activePapi =
    papis.length === 0
      ? ""
      : urlPapi && papis.includes(urlPapi)
        ? urlPapi
        : papis[0];

  useEffect(() => {
    if (!activePapi) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchJson<Paginated<TopRankEntry>>(
          `/api/top/ranking?papi=${encodeURIComponent(activePapi)}&page=${page}`,
        );
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [activePapi, page]);

  function handlePapiChange(value: string) {
    setPage(1);
    router.replace(`/top/ranking?papi=${encodeURIComponent(value)}`);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>数据加载失败</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (overview === null) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (overview.papiStats.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TrophyIcon />
          </EmptyMedia>
          <EmptyTitle>暂无排行数据</EmptyTitle>
          <EmptyDescription>还没有玩家上榜。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* 左侧：PAPI 选择列表 */}
      <Card className="lg:w-60 lg:shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">排行类型</CardTitle>
          <CardDescription>
            共 {overview.papiStats.length} 个排行榜
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-1">
            {overview.papiStats.map((stat) => {
              const active = activePapi === stat.papi;
              return (
                <button
                  key={stat.papi}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handlePapiChange(stat.papi)}
                  className={
                    "relative flex flex-col items-start gap-1 overflow-hidden rounded-md px-3 py-2 text-left transition-colors " +
                    (active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground")
                  }
                >
                  <span
                    aria-hidden
                    className={
                      "absolute inset-y-2 left-0 w-0.5 rounded-full transition-colors " +
                      (active ? "bg-primary" : "bg-transparent")
                    }
                  />
                  <span className="w-full font-mono text-xs leading-tight break-all">
                    {stat.papi}
                  </span>
                  <span
                    className={
                      "text-xs " +
                      (active ? "text-accent-foreground/70" : "text-muted-foreground")
                    }
                  >
                    {formatNumber(stat.players)} 名玩家
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 右侧：排名表格 */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrophyIcon className="size-4 text-muted-foreground" />
            排行榜
          </CardTitle>
          <CardDescription>
            {activePapi} — 按表内排名展示
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data === null || loading ? (
            <Skeleton className="h-64 w-full" />
          ) : data.items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>该排行榜暂无数据</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">名次</TableHead>
                    <TableHead>玩家</TableHead>
                    <TableHead className="text-right">值</TableHead>
                    <TableHead className="text-right">更新时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((entry) => (
                    <TableRow
                      key={`${entry.uuid}-${entry.rank}`}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/top/players/${entry.uuid}`)
                      }
                    >
                      <TableCell>
                        <Badge
                          variant={entry.rank <= 3 ? "default" : "outline"}
                        >
                          {entry.rank}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <Avatar className="size-6">
                            <AvatarImage
                              src={playerAvatarUrl(entry.name, 24)}
                              alt={entry.name}
                            />
                            <AvatarFallback>
                              {entry.name.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{entry.name}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumber(entry.value)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.updateAt ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  共 {formatNumber(data.total)} 名玩家，第 {data.page} /{" "}
                  {totalPages} 页
                </span>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        aria-disabled={page <= 1}
                        className={
                          page <= 1 ? "pointer-events-none opacity-50" : ""
                        }
                        onClick={() =>
                          setPage((prev) => Math.max(1, prev - 1))
                        }
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        aria-disabled={page >= totalPages}
                        className={
                          page >= totalPages
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                        onClick={() =>
                          setPage((prev) => Math.min(totalPages, prev + 1))
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TopRankingPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <RankingContent />
    </Suspense>
  );
}
