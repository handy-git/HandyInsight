"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  CoinsIcon,
  SearchIcon,
} from "lucide-react";

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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchJson, formatNumber } from "@/lib/common/format";
import { toggleSort, type SortOrder } from "@/lib/common/sort";
import type { Paginated } from "@/lib/common/types";
import {
  CURRENCY_LOG_DEFAULT_ORDER,
  type CurrencyLogEntry,
  type CurrencyLogSortField,
} from "@/lib/plugins/playercurrency/types";

interface Filters {
  keyword: string;
  type: string;
}

const EMPTY_FILTERS: Filters = { keyword: "", type: "" };

export default function CurrencyLogsPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [typeInput, setTypeInput] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<CurrencyLogSortField>("time");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [data, setData] = useState<Paginated<CurrencyLogEntry> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 筛选/翻页/排序任一条件变化即重新请求。
  // cleanup 的 cancelled 标志丢弃过期响应（快速切换时旧请求结果不覆盖新数据）。
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        sort,
        order,
      });
      if (filters.keyword) params.set("keyword", filters.keyword);
      if (filters.type) params.set("type", filters.type);
      try {
        const result = await fetchJson<Paginated<CurrencyLogEntry>>(
          `/api/currency/logs?${params.toString()}`,
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
    setFilters({ keyword: input.trim(), type: typeInput.trim() });
  }

  function handleReset() {
    setInput("");
    setTypeInput("");
    setPage(1);
    setSort("time");
    setOrder("desc");
    setFilters(EMPTY_FILTERS);
  }

  function handleSort(field: CurrencyLogSortField) {
    const next = toggleSort(
      { field: sort, order },
      field,
      CURRENCY_LOG_DEFAULT_ORDER[field],
    );
    setSort(next.field);
    setOrder(next.order);
    setPage(1);
  }

  const hasFilter = Boolean(filters.keyword || filters.type);
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>货币流水</CardTitle>
        <CardDescription>
          全部货币变更记录，支持按玩家、变更人、原因、类型筛选，点击表头排序
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="max-w-sm">
            <InputGroupInput
              placeholder="搜索玩家 / 变更人 / 原因"
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
            placeholder="货币类型"
            value={typeInput}
            onChange={(event) => setTypeInput(event.target.value)}
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
                <CoinsIcon />
              </EmptyMedia>
              <EmptyTitle>没有找到流水记录</EmptyTitle>
              <EmptyDescription>
                {hasFilter ? "没有符合筛选条件的记录。" : "还没有货币变更记录。"}
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
                  <SortableHead<CurrencyLogSortField>
                    label="玩家"
                    field="name"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <SortableHead<CurrencyLogSortField>
                    label="类型"
                    field="type"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <SortableHead<CurrencyLogSortField>
                    label="变更前"
                    field="oldBalance"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<CurrencyLogSortField>
                    label="变更值"
                    field="change"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<CurrencyLogSortField>
                    label="变更后"
                    field="balance"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <TableHead>原因</TableHead>
                  <TableHead>变更人</TableHead>
                  <SortableHead<CurrencyLogSortField>
                    label="时间"
                    field="time"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/currency/players/${log.playerUuid}`)
                    }
                  >
                    <TableCell className="font-medium">{log.playerName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatNumber(log.oldBalance)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          log.changeValue > 0
                            ? "text-red-600"
                            : log.changeValue < 0
                              ? "text-green-600"
                              : "text-muted-foreground"
                        }
                      >
                        {log.changeValue > 0 ? "+" : ""}
                        {formatNumber(log.changeValue)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(log.balance)}
                    </TableCell>
                    <TableCell>
                      {log.reason ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.operatorName ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.operatorTime ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {/* 末页行数不足时补空行，保持表格高度稳定，避免翻页/排序时页面跳动 */}
                {data.items.length < data.pageSize &&
                  Array.from(
                    { length: data.pageSize - data.items.length },
                    (_, index) => (
                      <TableRow
                        key={`fill-${index}`}
                        aria-hidden
                        className="pointer-events-none"
                      >
                        <TableCell colSpan={8} className="h-14" />
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
