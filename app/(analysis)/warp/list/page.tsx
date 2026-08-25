"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, MapPinIcon, SearchIcon } from "lucide-react";

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
import { McText } from "@/lib/common/mc-text";
import { toggleSort, type SortOrder } from "@/lib/common/sort";
import type { Paginated } from "@/lib/common/types";
import {
  WARP_LIST_DEFAULT_ORDER,
  type WarpListEntry,
  type WarpListSortField,
} from "@/lib/plugins/playerwarp/types";

interface Filters {
  keyword: string;
  type: string;
  server: string;
}

const EMPTY_FILTERS: Filters = { keyword: "", type: "", server: "" };

export default function WarpListPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [typeInput, setTypeInput] = useState("");
  const [serverInput, setServerInput] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<WarpListSortField>("createTime");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [data, setData] = useState<Paginated<WarpListEntry> | null>(null);
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
      if (filters.server) params.set("server", filters.server);
      try {
        const result = await fetchJson<Paginated<WarpListEntry>>(
          `/api/warp/list?${params.toString()}`,
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
    setFilters({
      keyword: input.trim(),
      type: typeInput.trim(),
      server: serverInput.trim(),
    });
  }

  function handleReset() {
    setInput("");
    setTypeInput("");
    setServerInput("");
    setPage(1);
    setFilters(EMPTY_FILTERS);
    // 排序一并恢复默认（创建时间倒序，保留置顶优先）
    setSort("createTime");
    setOrder("desc");
  }

  function handleSort(field: WarpListSortField) {
    const next = toggleSort(
      { field: sort, order },
      field,
      WARP_LIST_DEFAULT_ORDER[field],
    );
    setSort(next.field);
    setOrder(next.order);
    setPage(1);
  }

  const hasFilter = Boolean(filters.keyword || filters.type || filters.server);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>地标库</CardTitle>
        <CardDescription>
          全部地标，支持按名称、类型、服务器筛选，点击表头排序
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="max-w-sm">
            <InputGroupInput
              placeholder="搜索地标名称"
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
            placeholder="类型（如 传送点）"
            value={typeInput}
            onChange={(event) => setTypeInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSearch();
            }}
          />
          <Input
            className="w-40"
            placeholder="服务器"
            value={serverInput}
            onChange={(event) => setServerInput(event.target.value)}
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
                <MapPinIcon />
              </EmptyMedia>
              <EmptyTitle>没有找到地标</EmptyTitle>
              <EmptyDescription>
                {hasFilter ? "没有符合筛选条件的地标。" : "还没有玩家创建地标。"}
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
                  <SortableHead<WarpListSortField>
                    label="地标"
                    field="name"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <TableHead>类型</TableHead>
                  <SortableHead<WarpListSortField>
                    label="所有者"
                    field="owner"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <TableHead>服务器</TableHead>
                  <SortableHead<WarpListSortField>
                    label="价格"
                    field="price"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<WarpListSortField>
                    label="热力"
                    field="thermal"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<WarpListSortField>
                    label="流量"
                    field="tp"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<WarpListSortField>
                    label="创建时间"
                    field="createTime"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <SortableHead<WarpListSortField>
                    label="到期时间"
                    field="expirationTime"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((warp) => (
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
                    <TableCell>{warp.ownerName}</TableCell>
                    <TableCell>
                      {warp.serverName ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(warp.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(warp.thermalValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(warp.tpNumber)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {warp.createTime ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {warp.expirationTime ?? "—"}
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
                        <TableCell colSpan={9} className="h-14" />
                      </TableRow>
                    ),
                  )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                共 {data.total} 个地标，第 {data.page} / {totalPages} 页
              </span>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      aria-disabled={page <= 1}
                      className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      aria-disabled={page >= totalPages}
                      className={
                        page >= totalPages ? "pointer-events-none opacity-50" : ""
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
