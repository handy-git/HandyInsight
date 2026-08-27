"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, GiftIcon, SearchIcon } from "lucide-react";

import { SortableHead } from "@/components/sortable-head";
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
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
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchJson, formatNumber } from "@/lib/common/format";
import { toggleSort, type SortOrder } from "@/lib/common/sort";
import type { Paginated } from "@/lib/common/types";
import {
  TOP_REWARD_DEFAULT_ORDER,
  type TopRewardLogEntry,
  type TopRewardSortField,
} from "@/lib/plugins/playertop/types";

interface Filters {
  keyword: string;
  papi: string;
}

const EMPTY_FILTERS: Filters = { keyword: "", papi: "" };

/** 发奖状态展示：约定 1 为已发放，0 为待处理。 */
function StatusBadge({ status }: { status: number | null }) {
  if (status === 1) return <Badge>已发放</Badge>;
  if (status === 0) return <Badge variant="secondary">待处理</Badge>;
  return <span className="text-muted-foreground">—</span>;
}

export default function TopLogsPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [papiInput, setPapiInput] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<TopRewardSortField>("time");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [data, setData] = useState<Paginated<TopRewardLogEntry> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), sort, order });
      if (filters.keyword) params.set("keyword", filters.keyword);
      if (filters.papi) params.set("papi", filters.papi);
      try {
        const result = await fetchJson<Paginated<TopRewardLogEntry>>(
          `/api/top/logs?${params.toString()}`,
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
  }, [filters, page, sort, order]);

  function handleSearch() {
    setPage(1);
    setFilters({ keyword: input.trim(), papi: papiInput.trim() });
  }

  function handleReset() {
    setInput("");
    setPapiInput("");
    setPage(1);
    setSort("time");
    setOrder("desc");
    setFilters(EMPTY_FILTERS);
  }

  function handleSort(field: TopRewardSortField) {
    const next = toggleSort(
      { field: sort, order },
      field,
      TOP_REWARD_DEFAULT_ORDER[field],
    );
    setSort(next.field);
    setOrder(next.order);
    setPage(1);
  }

  const hasFilter = Boolean(filters.keyword || filters.papi);
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>发奖记录</CardTitle>
        <CardDescription>
          排行奖励发放记录，支持按玩家、排行类型筛选，点击表头排序
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="max-w-sm">
            <InputGroupInput
              placeholder="搜索玩家名 / UUID"
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
          <Input
            className="w-40"
            placeholder="排行类型"
            value={papiInput}
            onChange={(event) => setPapiInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSearch();
            }}
          />
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
          <Skeleton className="h-96 w-full" />
        ) : data.items.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GiftIcon />
              </EmptyMedia>
              <EmptyTitle>没有找到发奖记录</EmptyTitle>
              <EmptyDescription>
                {hasFilter ? "没有符合筛选条件的记录。" : "还没有发放过排行奖励。"}
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
                  <SortableHead<TopRewardSortField>
                    label="玩家"
                    field="name"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <SortableHead<TopRewardSortField>
                    label="排行类型"
                    field="papi"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <SortableHead<TopRewardSortField>
                    label="名次"
                    field="rank"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<TopRewardSortField>
                    label="状态"
                    field="status"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <SortableHead<TopRewardSortField>
                    label="时间"
                    field="time"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((reward) => (
                  <TableRow
                    key={reward.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/top/players/${reward.playerUuid}`)
                    }
                  >
                    <TableCell className="font-medium">
                      {reward.playerName}
                    </TableCell>
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
                      <StatusBadge status={reward.status} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {reward.createTime ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {data.items.length < data.pageSize &&
                  Array.from(
                    { length: data.pageSize - data.items.length },
                    (_, index) => (
                      <TableRow
                        key={`fill-${index}`}
                        aria-hidden
                        className="pointer-events-none"
                      >
                        <TableCell colSpan={5} className="h-14" />
                      </TableRow>
                    ),
                  )}
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
  );
}
