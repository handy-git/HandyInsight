"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AlertCircleIcon, HistoryIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
import { fetchJson, formatSeconds, secondsToHours } from "@/lib/format";
import type {
  Paginated,
  PlayerDetail,
  SessionItem,
  TrendPoint,
} from "@/types/playertime";

type DetailResponse = PlayerDetail & { trend: TrendPoint[] };

const chartConfig = {
  hours: { label: "在线时长（小时）", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function PlayerDetailPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sessions, setSessions] = useState<Paginated<SessionItem> | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<DetailResponse>(`/api/playertime/players/${uuid}`)
      .then(setDetail)
      .catch((err: Error) => setDetailError(err.message));
  }, [uuid]);

  const loadSessions = useCallback(
    (nextPage: number) => {
      fetchJson<Paginated<SessionItem>>(
        `/api/playertime/players/${uuid}/sessions?page=${nextPage}`,
      )
        .then(setSessions)
        .catch((err: Error) => setSessionsError(err.message));
    },
    [uuid],
  );

  useEffect(() => {
    loadSessions(page);
  }, [page, loadSessions]);

  if (detailError) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>加载玩家详情失败</AlertTitle>
        <AlertDescription>
          {detailError}
          <Link href="/players" className="ml-2 underline">
            返回玩家列表
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const chartData = detail.trend.map((point) => ({
    date: point.date.slice(5),
    hours: secondsToHours(point.seconds),
  }));
  const totalPages = sessions
    ? Math.max(1, Math.ceil(sessions.total / sessions.pageSize))
    : 1;

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/players" />}>
              玩家列表
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{detail.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {detail.name}
              <Badge variant={detail.online ? "default" : "outline"}>
                {detail.online ? "在线" : "离线"}
              </Badge>
            </CardTitle>
            <CardDescription>
              {detail.uuid}
              {detail.online && detail.loginTime
                ? ` · 本次登录于 ${detail.loginTime}`
                : ""}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "今日在线", value: formatSeconds(detail.todaySeconds) },
          { title: "本周在线", value: formatSeconds(detail.weekSeconds) },
          { title: "本月在线", value: formatSeconds(detail.monthSeconds) },
          { title: "累计在线", value: formatSeconds(detail.totalSeconds) },
        ].map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-2xl">{card.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近 30 天趋势</CardTitle>
          <CardDescription>每日在线时长</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <AreaChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="var(--color-hours)"
                fill="var(--color-hours)"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>最近在线会话</CardTitle>
          <CardDescription>按登录时间倒序</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {sessionsError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>会话加载失败</AlertTitle>
              <AlertDescription>{sessionsError}</AlertDescription>
            </Alert>
          ) : sessions === null ? (
            <Skeleton className="h-64 w-full" />
          ) : sessions.items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HistoryIcon />
                </EmptyMedia>
                <EmptyTitle>暂无会话记录</EmptyTitle>
                <EmptyDescription>该玩家还没有在线会话记录。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>登录时间</TableHead>
                    <TableHead>退出时间</TableHead>
                    <TableHead className="text-right">时长</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.items.map((session, index) => (
                    <TableRow key={`${session.loginTime}-${index}`}>
                      <TableCell>{session.loginTime}</TableCell>
                      <TableCell>
                        {session.quitTime ?? (
                          <Badge variant="default">进行中</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatSeconds(session.seconds)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  共 {sessions.total} 条会话，第 {sessions.page} / {totalPages} 页
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
    </>
  );
}
