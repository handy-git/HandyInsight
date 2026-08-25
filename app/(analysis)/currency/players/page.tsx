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
import { playerAvatarUrl } from "@/lib/common/avatar";
import { fetchJson, formatNumber } from "@/lib/common/format";
import { toggleSort, type SortOrder } from "@/lib/common/sort";
import type { Paginated } from "@/lib/common/types";
import {
  CURRENCY_PLAYER_DEFAULT_ORDER,
  type CurrencyPlayerItem,
  type CurrencyPlayerSortField,
} from "@/lib/plugins/playercurrency/types";

export default function CurrencyPlayersPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<CurrencyPlayerSortField>("balance");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [data, setData] = useState<Paginated<CurrencyPlayerItem> | null>(null);
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
        const result = await fetchJson<Paginated<CurrencyPlayerItem>>(
          `/api/currency/players?${params}`,
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

  function handleSort(field: CurrencyPlayerSortField) {
    const next = toggleSort(
      { field: sort, order },
      field,
      CURRENCY_PLAYER_DEFAULT_ORDER[field],
    );
    setSort(next.field);
    setOrder(next.order);
    setPage(1);
  }

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>货币玩家</CardTitle>
        <CardDescription>
          按玩家名称搜索，点击表头排序，点击行查看货币详情
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <InputGroup className="max-w-sm">
          <InputGroupInput
            placeholder="搜索玩家名称"
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
                <CoinsIcon />
              </EmptyMedia>
              <EmptyTitle>没有找到玩家</EmptyTitle>
              <EmptyDescription>
                {keyword
                  ? `没有名称包含“${keyword}”的玩家。`
                  : "还没有玩家持有货币。"}
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
                  <SortableHead<CurrencyPlayerSortField>
                    label="玩家"
                    field="name"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <SortableHead<CurrencyPlayerSortField>
                    label="货币类型"
                    field="types"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<CurrencyPlayerSortField>
                    label="总余额"
                    field="balance"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<CurrencyPlayerSortField>
                    label="最近变动"
                    field="lastChange"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((player) => (
                  <TableRow
                    key={player.uuid}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/currency/players/${player.uuid}`)
                    }
                  >
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <Avatar size="sm">
                          <AvatarImage
                            src={playerAvatarUrl(player.name, 32)}
                            alt={player.name}
                          />
                          <AvatarFallback>
                            {player.name.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{player.name}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{player.typeCount} 种</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(player.totalBalance)}
                    </TableCell>
                    <TableCell>
                      {player.lastChangeAt ?? (
                        <span className="text-muted-foreground">—</span>
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
                        <TableCell colSpan={4} className="h-14" />
                      </TableRow>
                    ),
                  )}
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
