"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, SearchIcon, UsersIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { playerAvatarUrl } from "@/lib/common/avatar";
import { McText } from "@/lib/common/mc-text";
import {
  fetchJson,
  formatDateTime,
  formatNumber,
  formatSeconds,
} from "@/lib/common/format";
import type { Paginated } from "@/lib/common/types";
import type { UnifiedPlayerItem } from "@/lib/common/unified";

const SORT_OPTIONS = [
  { value: "recent", label: "最近活跃" },
  { value: "registered", label: "注册时间" },
  { value: "playtime", label: "在线时长" },
  { value: "signin", label: "签到次数" },
  { value: "intensify", label: "强化次数" },
] as const;

function relativeTime(dateTime: string | null): string {
  if (!dateTime) return "从未上线";
  const diff = Date.now() - new Date(dateTime.replace(" ", "T")).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return formatDateTime(dateTime) || dateTime;
}

export default function UnifiedPlayersPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]["value"]>(
    "recent",
  );
  const [data, setData] = useState<Paginated<UnifiedPlayerItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (nextKeyword: string, nextPage: number, nextSort: typeof sort) => {
      fetchJson<Paginated<UnifiedPlayerItem>>(
        `/api/players?keyword=${encodeURIComponent(nextKeyword)}&page=${nextPage}&sort=${nextSort}`,
      )
        .then(setData)
        .catch((err: Error) => setError(err.message));
    },
    [],
  );

  useEffect(() => {
    load(keyword, page, sort);
  }, [keyword, page, sort, load]);

  function handleSearch() {
    setPage(1);
    setKeyword(input.trim());
  }

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>全服玩家</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
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
          <ToggleGroup
            value={[sort]}
            onValueChange={(values) => {
              const next = values[0] as typeof sort | undefined;
              if (next) {
                setPage(1);
                setSort(next);
              }
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
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
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>没有找到玩家</EmptyTitle>
              <EmptyDescription>
                {keyword
                  ? `没有名称包含“${keyword}”的玩家。`
                  : "还没有任何玩家数据。"}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>玩家</TableHead>
                  <TableHead>公会</TableHead>
                  <TableHead>权限组</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead className="text-right">总时长</TableHead>
                  <TableHead className="text-right">签到</TableHead>
                  <TableHead className="text-right">宠物</TableHead>
                  <TableHead className="text-right">宠物币</TableHead>
                  <TableHead className="text-right">称号币</TableHead>
                  <TableHead className="text-right">任务币</TableHead>
                  <TableHead className="text-right">强化</TableHead>
                  <TableHead className="text-right">最近活跃</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((player) => (
                  <TableRow
                    key={player.key}
                    className="cursor-pointer"
                    onClick={() => router.push(`/overview/players/${player.key}`)}
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
                        {player.online && <Badge>在线</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-32">
                      {player.guildName ? (
                        <span className="block truncate" title={player.guildName}>
                          <McText text={player.guildName} />
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-32">
                      {player.primaryGroup ? (
                        <span
                          className="block truncate"
                          title={player.primaryGroup}
                        >
                          <McText text={player.primaryGroup} />
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDateTime(player.registeredAt) || "—"}</TableCell>
                    <TableCell className="text-right">
                      {player.totalSeconds > 0
                        ? formatSeconds(player.totalSeconds)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {player.totalSigns > 0 ? `${player.totalSigns} 次` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {player.companionCount > 0 ? `${player.companionCount} 只` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {player.companionCoins === null
                        ? "—"
                        : formatNumber(player.companionCoins)}
                    </TableCell>
                    <TableCell className="text-right">
                      {player.titleCoins === null
                        ? "—"
                        : formatNumber(player.titleCoins)}
                    </TableCell>
                    <TableCell className="text-right">
                      {player.taskCoins === null
                        ? "—"
                        : formatNumber(player.taskCoins)}
                    </TableCell>
                    <TableCell className="text-right">
                      {player.intensifyAttempts > 0
                        ? `${player.intensifyAttempts} 次`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {relativeTime(player.lastActiveAt)}
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
