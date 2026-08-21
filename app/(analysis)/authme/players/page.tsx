"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, SearchIcon, UsersIcon } from "lucide-react";

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
import { fetchJson } from "@/lib/common/format";
import type { Paginated } from "@/lib/common/types";
import type { AuthmeAccountItem } from "@/lib/plugins/authme/types";

function formatLocation(account: AuthmeAccountItem): string {
  const x = Math.round(account.x);
  const y = Math.round(account.y);
  const z = Math.round(account.z);
  return `${account.world}（${x}, ${y}, ${z}）`;
}

export default function AuthmePlayersPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AuthmeAccountItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((nextKeyword: string, nextPage: number) => {
    fetchJson<Paginated<AuthmeAccountItem>>(
      `/api/authme/players?keyword=${encodeURIComponent(nextKeyword)}&page=${nextPage}`,
    )
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load(keyword, page);
  }, [keyword, page, load]);

  function handleSearch() {
    setPage(1);
    setKeyword(input.trim());
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>账户列表</CardTitle>
        <CardDescription>
          按玩家名称搜索，点击行进入账户详情；展示最近登录 IP 与最后下线位置
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
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>没有找到账户</EmptyTitle>
              <EmptyDescription>
                {keyword
                  ? `没有名称包含“${keyword}”的账户。`
                  : "还没有任何注册账户。"}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>玩家</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead>最近登录</TableHead>
                  <TableHead className="text-right">最近 IP</TableHead>
                  <TableHead className="text-right">最后位置</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((account) => (
                  <TableRow
                    key={account.username}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/authme/players/${account.username}`)
                    }
                  >
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {account.realname}
                        {account.logged && <Badge>在线</Badge>}
                      </span>
                    </TableCell>
                    <TableCell>{account.email ?? "—"}</TableCell>
                    <TableCell>{account.regDate ?? "—"}</TableCell>
                    <TableCell>{account.lastLoginAt ?? "从未登录"}</TableCell>
                    <TableCell className="text-right">
                      {account.ip ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatLocation(account)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                共 {data.total} 个账户，第 {data.page} / {totalPages} 页
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
