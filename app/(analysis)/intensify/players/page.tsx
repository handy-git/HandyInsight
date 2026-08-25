"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, SearchIcon, UsersIcon } from "lucide-react";

import { SortableHead } from "@/components/sortable-head";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { fetchJson } from "@/lib/common/format";
import { toggleSort, type SortOrder } from "@/lib/common/sort";
import { McText } from "@/lib/common/mc-text";
import type { Paginated } from "@/lib/common/types";
import {
  INTENSIFY_DEFAULT_ORDER,
  type IntensifyPlayerItem,
  type IntensifySortField,
} from "@/lib/plugins/playerintensify/types";

function rateText(rate: number | null): string {
  return rate === null ? "—" : `${rate}%`;
}

export default function IntensifyPlayersPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<IntensifySortField>("attempts");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [data, setData] = useState<Paginated<IntensifyPlayerItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (
      nextKeyword: string,
      nextPage: number,
      nextSort: IntensifySortField,
      nextOrder: SortOrder,
    ) => {
      const params = new URLSearchParams({
        keyword: nextKeyword,
        page: String(nextPage),
        sort: nextSort,
        order: nextOrder,
      });
      fetchJson<Paginated<IntensifyPlayerItem>>(
        `/api/intensify/players?${params}`,
      )
        .then(setData)
        .catch((err: Error) => setError(err.message));
    },
    [],
  );

  useEffect(() => {
    load(keyword, page, sort, order);
  }, [keyword, page, sort, order, load]);

  function handleSearch() {
    setPage(1);
    setKeyword(input.trim());
  }

  function handleSort(field: IntensifySortField) {
    const next = toggleSort(
      { field: sort, order },
      field,
      INTENSIFY_DEFAULT_ORDER[field],
    );
    setSort(next.field);
    setOrder(next.order);
    setPage(1);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>强化玩家</CardTitle>
        <CardDescription>
          按玩家名称或 UUID 搜索，点击表头排序，点击行进入强化详情
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <InputGroup className="max-w-sm">
          <InputGroupInput
            placeholder="搜索玩家名称或 UUID"
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
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>没有找到玩家</EmptyTitle>
              <EmptyDescription>
                {keyword
                  ? `没有名称或 UUID 包含“${keyword}”的玩家。`
                  : "还没有任何强化记录。"}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead<IntensifySortField>
                    label="玩家"
                    field="name"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <SortableHead<IntensifySortField>
                    label="强化总次数"
                    field="attempts"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<IntensifySortField>
                    label="成功"
                    field="succeed"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<IntensifySortField>
                    label="失败"
                    field="failure"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<IntensifySortField>
                    label="成功率"
                    field="rate"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<IntensifySortField>
                    label="最高等级"
                    field="level"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <TableHead>最高装备</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((player) => (
                  <TableRow
                    key={player.uuid}
                    className="cursor-pointer"
                    onClick={() => router.push(`/intensify/players/${player.uuid}`)}
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
                      {player.totalAttempts} 次
                    </TableCell>
                    <TableCell className="text-right">
                      {player.succeedNum} 次
                    </TableCell>
                    <TableCell className="text-right">
                      {player.failureNum} 次
                    </TableCell>
                    <TableCell className="text-right">
                      {rateText(player.successRate)}
                    </TableCell>
                    <TableCell className="text-right">
                      +{player.maxLevel}
                    </TableCell>
                    <TableCell>
                      {player.maxLevelName ? (
                        <McText text={player.maxLevelName} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                共 {data.total} 名玩家，第 {page} / {totalPages} 页
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
