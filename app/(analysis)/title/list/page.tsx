"use client";

import { useEffect, useState } from "react";
import { AlertCircleIcon, MedalIcon, SearchIcon } from "lucide-react";

import { SortableHead } from "@/components/sortable-head";
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
  TITLE_LIST_DEFAULT_ORDER,
  type TitleListItem,
  type TitleListSortField,
} from "@/lib/plugins/playertitle/types";

function formatPrice(item: TitleListItem): string {
  if (!item.buyType) return "—";
  if (item.amount === null) return item.buyType;
  return `${item.buyType} × ${formatNumber(item.amount)}`;
}

function formatDuration(day: number): string {
  return day === 0 ? "永久" : `${day} 天`;
}

export default function TitleListPage() {
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<TitleListSortField>("position");
  const [order, setOrder] = useState<SortOrder>("asc");
  const [data, setData] = useState<Paginated<TitleListItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 搜索/翻页/排序任一条件变化即重新请求。
  // cleanup 的 cancelled 标志丢弃过期响应（快速切换时旧请求结果不覆盖新数据）。
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        keyword,
        page: String(page),
        sort,
        order,
      });
      try {
        const result = await fetchJson<Paginated<TitleListItem>>(
          `/api/playertitle/list?${params}`,
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
  }, [keyword, page, sort, order]);

  function handleSearch() {
    setPage(1);
    setKeyword(input.trim());
  }

  function handleSort(field: TitleListSortField) {
    const next = toggleSort(
      { field: sort, order },
      field,
      TITLE_LIST_DEFAULT_ORDER[field],
    );
    setSort(next.field);
    setOrder(next.order);
    setPage(1);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>称号库</CardTitle>
        <CardDescription>
          全部称号及其配置（价格、时长、粒子、属性），点击表头排序
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <InputGroup className="max-w-sm">
          <InputGroupInput
            placeholder="搜索称号名称"
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
                <MedalIcon />
              </EmptyMedia>
              <EmptyTitle>没有找到称号</EmptyTitle>
              <EmptyDescription>
                {keyword
                  ? `没有名称包含“${keyword}”的称号。`
                  : "称号库为空。"}
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
                  <SortableHead<TitleListSortField>
                    label="称号"
                    field="name"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <TableHead>描述</TableHead>
                  <SortableHead<TitleListSortField>
                    label="价格"
                    field="price"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <SortableHead<TitleListSortField>
                    label="时长"
                    field="day"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <TableHead>粒子</TableHead>
                  <TableHead>属性</TableHead>
                  <TableHead className="text-right">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <McText text={item.titleName} />
                    </TableCell>
                    <TableCell>
                      {item.description ? (
                        <McText text={item.description} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{formatPrice(item)}</TableCell>
                    <TableCell>{formatDuration(item.day)}</TableCell>
                    <TableCell>{item.particleType ?? "—"}</TableCell>
                    <TableCell>
                      {item.buffTypes.length > 0 ? (
                        <span className="flex flex-wrap gap-1">
                          {item.buffTypes.map((buffType) => (
                            <Badge key={buffType} variant="outline">
                              {buffType}
                            </Badge>
                          ))}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.isHide ? (
                        <Badge variant="outline">隐藏</Badge>
                      ) : (
                        <Badge>上架</Badge>
                      )}
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
                        <TableCell colSpan={7} className="h-14" />
                      </TableRow>
                    ),
                  )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                共 {data.total} 个称号，第 {data.page} / {totalPages} 页
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
