"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, CrownIcon, SearchIcon } from "lucide-react";

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
  GUILD_LIST_DEFAULT_ORDER,
  type GuildListItem,
  type GuildListSortField,
} from "@/lib/plugins/playerguild/types";

export default function GuildListPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<GuildListSortField>("members");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [data, setData] = useState<Paginated<GuildListItem> | null>(null);
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
      if (keyword) params.set("keyword", keyword);
      try {
        const result = await fetchJson<Paginated<GuildListItem>>(
          `/api/guild/list?${params.toString()}`,
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

  function handleReset() {
    setInput("");
    setPage(1);
    setKeyword("");
    setSort("members");
    setOrder("desc");
  }

  function handleSort(field: GuildListSortField) {
    const next = toggleSort(
      { field: sort, order },
      field,
      GUILD_LIST_DEFAULT_ORDER[field],
    );
    setSort(next.field);
    setOrder(next.order);
    setPage(1);
  }

  const hasFilter = Boolean(keyword);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>公会列表</CardTitle>
        <CardDescription>
          全部公会，支持按名称 / 会长搜索，点击表头排序
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="max-w-sm">
            <InputGroupInput
              placeholder="搜索公会名称 / 会长"
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
          <Skeleton className="h-96 w-full" />
        ) : data.items.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CrownIcon />
              </EmptyMedia>
              <EmptyTitle>没有找到公会</EmptyTitle>
              <EmptyDescription>
                {hasFilter ? "没有符合筛选条件的公会。" : "还没有玩家创建公会。"}
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
                  <SortableHead<GuildListSortField>
                    label="公会"
                    field="name"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <SortableHead<GuildListSortField>
                    label="等级"
                    field="level"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<GuildListSortField>
                    label="成员"
                    field="members"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<GuildListSortField>
                    label="资金"
                    field="money"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<GuildListSortField>
                    label="活跃度"
                    field="prosperity"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<GuildListSortField>
                    label="月度活跃"
                    field="monthProsperity"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <TableHead>会长</TableHead>
                  <SortableHead<GuildListSortField>
                    label="创建时间"
                    field="createTime"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((guild) => (
                  <TableRow
                    key={guild.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/guild/list/${guild.id}`)}
                  >
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <McText text={guild.name} />
                        {guild.seasonRank > 0 && (
                          <Badge>赛季 #{guild.seasonRank}</Badge>
                        )}
                        {!guild.joinMode && (
                          <Badge variant="outline" className="text-muted-foreground">
                            免审批
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(guild.level)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(guild.memberTotal)}
                      {guild.memberMaxCount > 0 && (
                        <span className="text-muted-foreground">
                          /{formatNumber(guild.memberMaxCount)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(guild.money)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(guild.prosperityDegree)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(guild.monthProsperityDegree)}
                    </TableCell>
                    <TableCell>{guild.creator ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {guild.createTime ?? "—"}
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
                共 {formatNumber(data.total)} 个公会，第 {data.page} /{" "}
                {totalPages} 页
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
