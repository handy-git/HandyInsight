"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, MapPinIcon, SearchIcon } from "lucide-react";

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
import type { Paginated } from "@/lib/common/types";
import type { WarpListEntry } from "@/lib/plugins/playerwarp/types";

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
  const [data, setData] = useState<Paginated<WarpListEntry> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((nextFilters: Filters, nextPage: number) => {
    const params = new URLSearchParams({ page: String(nextPage) });
    if (nextFilters.keyword) params.set("keyword", nextFilters.keyword);
    if (nextFilters.type) params.set("type", nextFilters.type);
    if (nextFilters.server) params.set("server", nextFilters.server);
    fetchJson<Paginated<WarpListEntry>>(`/api/warp/list?${params.toString()}`)
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load(filters, page);
  }, [filters, page, load]);

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
  }

  const hasFilter = Boolean(filters.keyword || filters.type || filters.server);
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>地标库</CardTitle>
        <CardDescription>全部地标，支持按名称、类型、服务器筛选</CardDescription>
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
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={handleReset}
            >
              重置筛选
            </button>
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
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>地标</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>所有者</TableHead>
                  <TableHead>服务器</TableHead>
                  <TableHead className="text-right">价格</TableHead>
                  <TableHead className="text-right">热力</TableHead>
                  <TableHead className="text-right">流量</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>到期时间</TableHead>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
