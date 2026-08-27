"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, KeyRoundIcon, SearchIcon } from "lucide-react";

import { SortableHead } from "@/components/sortable-head";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { playerAvatarUrl } from "@/lib/common/avatar";
import { fetchJson, formatNumber } from "@/lib/common/format";
import { McText } from "@/lib/common/mc-text";
import { toggleSort, type SortOrder } from "@/lib/common/sort";
import type { Paginated } from "@/lib/common/types";
import {
  LUCKPERMS_PLAYER_DEFAULT_ORDER,
  type LuckPermsPlayerItem,
  type LuckPermsPlayerSortField,
} from "@/lib/plugins/luckperms/types";

export default function LuckPermsPlayersPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<LuckPermsPlayerSortField>("primaryGroup");
  const [order, setOrder] = useState<SortOrder>("asc");
  const [data, setData] = useState<Paginated<LuckPermsPlayerItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        const result = await fetchJson<Paginated<LuckPermsPlayerItem>>(
          `/api/luckperms/players?${params.toString()}`,
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
    setSort("primaryGroup");
    setOrder("asc");
  }

  function handleSort(field: LuckPermsPlayerSortField) {
    const next = toggleSort(
      { field: sort, order },
      field,
      LUCKPERMS_PLAYER_DEFAULT_ORDER[field],
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
        <CardTitle>权限玩家</CardTitle>
        <CardDescription>
          有权限记录的玩家，支持搜索与排序，点击查看玩家详情
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
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
                <KeyRoundIcon />
              </EmptyMedia>
              <EmptyTitle>没有找到玩家</EmptyTitle>
              <EmptyDescription>
                {hasFilter ? "没有符合筛选条件的玩家。" : "还没有玩家的权限记录。"}
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
                  <SortableHead<LuckPermsPlayerSortField>
                    label="玩家"
                    field="username"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <SortableHead<LuckPermsPlayerSortField>
                    label="主权限组"
                    field="primaryGroup"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <SortableHead<LuckPermsPlayerSortField>
                    label="直接权限"
                    field="directPermissions"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((player) => (
                  <TableRow
                    key={player.uuid}
                    className="cursor-pointer"
                    onClick={() => router.push(`/overview/players/${player.uuid}`)}
                  >
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <Avatar size="sm">
                          <AvatarImage
                            src={playerAvatarUrl(player.username, 32)}
                            alt={player.username}
                          />
                          <AvatarFallback>
                            {player.username.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {player.username}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <McText text={player.primaryGroup} />
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {player.directPermissionCount === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatNumber(player.directPermissionCount)
                      )}
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
                        <TableCell colSpan={3} className="h-14" />
                      </TableRow>
                    ),
                  )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                共 {formatNumber(data.total)} 名玩家，第 {data.page} / {totalPages}{" "}
                页
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
