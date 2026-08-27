"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  AlertCircleIcon,
  PieChartIcon,
  ScrollTextIcon,
  SearchIcon,
  TrendingUpIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
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
import { fetchJson, formatNumber } from "@/lib/common/format";
import { McText } from "@/lib/common/mc-text";
import type { LuckPermsLogPage } from "@/lib/plugins/luckperms/types";

const chartConfig = {
  count: { label: "操作次数", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function LuckPermsLogsPage() {
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LuckPermsLogPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page) });
      if (keyword) params.set("keyword", keyword);
      try {
        const result = await fetchJson<LuckPermsLogPage>(
          `/api/luckperms/logs?${params.toString()}`,
        );
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [keyword, page]);

  function handleSearch() {
    setPage(1);
    setKeyword(input.trim());
  }

  function handleReset() {
    setInput("");
    setPage(1);
    setKeyword("");
  }

  const hasFilter = Boolean(keyword);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const chartData = (data?.stats.trend ?? []).map((point) => ({
    date: point.date.slice(5),
    count: point.count,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">操作日志</h2>
          <p className="text-sm text-muted-foreground">
            LuckPerms 权限变更审计记录
            {data !== null && ` · 累计 ${formatNumber(data.stats.total)} 条`}
          </p>
        </div>
        <InputGroup className="max-w-sm">
          <InputGroupInput
            placeholder="搜索操作者 / 操作对象"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSearch();
            }}
          />
          <InputGroupButton onClick={handleSearch}>
            <SearchIcon data-icon="inline-start" />
            搜索
          </InputGroupButton>
        </InputGroup>
        {hasFilter && (
          <Button
            variant="link"
            size="sm"
            className="h-auto px-0 text-muted-foreground"
            onClick={handleReset}
          >
            重置筛选
          </Button>
        )}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>数据加载失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : data === null ? (
        <>
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-96 w-full" />
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUpIcon className="size-4 text-muted-foreground" />
                操作趋势
              </CardTitle>
              <CardDescription>近 30 天每日权限操作次数</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <BarChart data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="size-4 text-muted-foreground" />
                操作类型分布
              </CardTitle>
              <CardDescription>按操作对象类型统计</CardDescription>
            </CardHeader>
            <CardContent>
              {data.stats.typeDistribution.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <PieChartIcon />
                    </EmptyMedia>
                    <EmptyTitle>暂无操作记录</EmptyTitle>
                    <EmptyDescription>还没有任何权限操作日志。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.stats.typeDistribution.map((entry) => (
                    <Badge key={entry.type} variant="outline" className="px-3 py-1">
                      {entry.type} · {formatNumber(entry.count)}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollTextIcon className="size-4 text-muted-foreground" />
                最近操作
              </CardTitle>
              <CardDescription>按时间倒序排列</CardDescription>
            </CardHeader>
            <CardContent>
              {data.items.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ScrollTextIcon />
                    </EmptyMedia>
                    <EmptyTitle>没有找到操作记录</EmptyTitle>
                    <EmptyDescription>
                      {hasFilter ? "没有符合筛选条件的记录。" : "暂无操作记录。"}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div
                  className={
                    "flex flex-col gap-4 transition-opacity duration-150 " +
                    (loading ? "pointer-events-none opacity-60" : "")
                  }
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>时间</TableHead>
                        <TableHead>操作者</TableHead>
                        <TableHead>对象类型</TableHead>
                        <TableHead>操作对象</TableHead>
                        <TableHead>操作内容</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.items.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {log.time}
                          </TableCell>
                          <TableCell>{log.actorName ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.type}</Badge>
                          </TableCell>
                          <TableCell>{log.actedName ?? "—"}</TableCell>
                          <TableCell className="max-w-md truncate">
                            <McText text={log.action} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      共 {formatNumber(data.total)} 条记录，第 {data.page} /{" "}
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
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
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
        </>
      )}
    </div>
  );
}
