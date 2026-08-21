"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, SearchIcon, UsersIcon } from "lucide-react";

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
import type { Paginated } from "@/lib/common/types";
import type { SignInPlayerItem } from "@/lib/plugins/playersignin/types";

export default function SignInPlayersPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<SignInPlayerItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((nextKeyword: string, nextPage: number) => {
    fetchJson<Paginated<SignInPlayerItem>>(
      `/api/playersignin/players?keyword=${encodeURIComponent(nextKeyword)}&page=${nextPage}`,
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
        <CardTitle>签到玩家</CardTitle>
        <CardDescription>按玩家名称搜索，点击行进入签到详情</CardDescription>
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
              <EmptyTitle>没有找到玩家</EmptyTitle>
              <EmptyDescription>
                {keyword
                  ? `没有名称包含“${keyword}”的玩家。`
                  : "还没有任何签到记录。"}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>玩家</TableHead>
                  <TableHead className="text-right">累计签到</TableHead>
                  <TableHead className="text-right">本月签到</TableHead>
                  <TableHead className="text-right">最近签到</TableHead>
                  <TableHead className="text-right">补签卡</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((player) => (
                    <TableRow
                      key={player.uuid}
                      className="cursor-pointer"
                      onClick={() => router.push(`/signin/players/${player.uuid}`)}
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
                      {player.totalSigns} 次
                    </TableCell>
                    <TableCell className="text-right">
                      {player.monthSigns} 次
                    </TableCell>
                    <TableCell className="text-right">
                      {player.lastSignAt || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {player.cards} 张
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                共 {data.total} 名玩家，第 {data.page} / {totalPages} 页
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
