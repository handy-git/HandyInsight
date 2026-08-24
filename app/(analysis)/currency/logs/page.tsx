"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  CoinsIcon,
  SearchIcon,
} from "lucide-react";

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
import { fetchJson } from "@/lib/common/format";
import type { Paginated } from "@/lib/common/types";
import type { CurrencyLogEntry } from "@/lib/plugins/playercurrency/types";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

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
  const [data, setData] = useState<Paginated<CurrencyLogEntry> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((nextFilters: Filters, nextPage: number) => {
    const params = new URLSearchParams({ page: String(nextPage) });
    if (nextFilters.keyword) params.set("keyword", nextFilters.keyword);
    if (nextFilters.type) params.set("type", nextFilters.type);
    fetchJson<Paginated<CurrencyLogEntry>>(
      `/api/currency/logs?${params.toString()}`,
    )
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load(filters, page);
  }, [filters, page, load]);

  function handleSearch() {
    setPage(1);
    setFilters({ keyword: input.trim(), type: typeInput.trim() });
  }

  function handleReset() {
    setInput("");
    setTypeInput("");
    setPage(1);
    setFilters(EMPTY_FILTERS);
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
          全部货币变更记录，支持按玩家、变更人、原因、类型筛选
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
            <button
              type="button"
              className="cursor-pointer text-sm text-muted-foreground underline-offset-4 hover:underline"
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
                <CoinsIcon />
              </EmptyMedia>
              <EmptyTitle>没有找到流水记录</EmptyTitle>
              <EmptyDescription>
                {hasFilter ? "没有符合筛选条件的记录。" : "还没有货币变更记录。"}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>玩家</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead className="text-right">变更前</TableHead>
                  <TableHead className="text-right">变更值</TableHead>
                  <TableHead className="text-right">变更后</TableHead>
                  <TableHead>原因</TableHead>
                  <TableHead>变更人</TableHead>
                  <TableHead>时间</TableHead>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
