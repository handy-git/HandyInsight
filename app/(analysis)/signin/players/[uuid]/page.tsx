"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getDate, getDay, getDaysInMonth, startOfMonth } from "date-fns";
import { AlertCircleIcon, CalendarXIcon, TicketIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { playerAvatarUrl } from "@/lib/common/avatar";
import { fetchJson } from "@/lib/common/format";
import { cn } from "@/lib/utils";
import type { Paginated } from "@/lib/common/types";
import type {
  SignInPlayerDetail,
  SignInRecord,
} from "@/lib/plugins/playersignin/types";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export default function SignInPlayerDetailPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const [detail, setDetail] = useState<SignInPlayerDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<Paginated<SignInRecord> | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<SignInPlayerDetail>(`/api/playersignin/players/${uuid}`)
      .then(setDetail)
      .catch((err: Error) => setDetailError(err.message));
  }, [uuid]);

  const loadRecords = useCallback(
    (nextPage: number) => {
      fetchJson<Paginated<SignInRecord>>(
        `/api/playersignin/players/${uuid}/records?page=${nextPage}`,
      )
        .then(setRecords)
        .catch((err: Error) => setRecordsError(err.message));
    },
    [uuid],
  );

  useEffect(() => {
    loadRecords(page);
  }, [page, loadRecords]);

  if (detailError) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>加载签到详情失败</AlertTitle>
        <AlertDescription>
          {detailError}
          <Link href="/signin/players" className="ml-2 underline">
            返回签到玩家
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

  // 本月日历：周一为一周起点，已签到日期高亮
  const monthStart = startOfMonth(new Date());
  const daysInMonth = getDaysInMonth(monthStart);
  const leadingBlanks = (getDay(monthStart) + 6) % 7;
  const today = getDate(new Date());
  const signedDays = new Set(detail.monthDays);
  const totalPages = records
    ? Math.max(1, Math.ceil(records.total / records.pageSize))
    : 1;

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/signin/players" />}>
              签到玩家
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{detail.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarImage
                src={playerAvatarUrl(detail.uuid, 64)}
                alt={detail.name}
              />
              <AvatarFallback>
                {detail.name.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {detail.name}
            {signedDays.has(today) && <Badge>今日已签</Badge>}
          </CardTitle>
          <CardDescription>
            {detail.uuid}
            {detail.lastSignAt ? ` · 最近签到于 ${detail.lastSignAt}` : ""}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "累计签到", value: `${detail.totalSigns} 次` },
          { title: "本月签到", value: `${detail.monthSigns} 次` },
          { title: "连续签到", value: `${detail.streak} 天` },
          {
            title: "补签卡",
            value: `${detail.cards.reduce((sum, card) => sum + card.amount, 0)} 张`,
          },
        ].map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-2xl">{card.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>本月签到日历</CardTitle>
            <CardDescription>高亮日期表示已签到</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {WEEKDAYS.map((weekday) => (
                <div key={weekday} className="py-1">
                  {weekday}
                </div>
              ))}
              {Array.from({ length: leadingBlanks }).map((_, index) => (
                <div key={`blank-${index}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1;
                const signed = signedDays.has(day);
                return (
                  <div
                    key={day}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-md text-sm",
                      signed && "bg-primary font-medium text-primary-foreground",
                      !signed && day === today && "ring-1 ring-primary",
                    )}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>补签卡</CardTitle>
            <CardDescription>该玩家持有的虚拟补签卡</CardDescription>
          </CardHeader>
          <CardContent>
            {detail.cards.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <TicketIcon />
                  </EmptyMedia>
                  <EmptyTitle>没有补签卡</EmptyTitle>
                  <EmptyDescription>该玩家当前不持有补签卡。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类型</TableHead>
                    <TableHead>可用月份</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.cards.map((card, index) => (
                    <TableRow key={`${card.cardType}-${index}`}>
                      <TableCell className="font-medium">
                        {card.cardType}
                      </TableCell>
                      <TableCell>{card.cardMonth ?? "不限"}</TableCell>
                      <TableCell className="text-right">
                        {card.amount} 张
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>签到记录</CardTitle>
          <CardDescription>按签到时间倒序</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {recordsError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>记录加载失败</AlertTitle>
              <AlertDescription>{recordsError}</AlertDescription>
            </Alert>
          ) : records === null ? (
            <Skeleton className="h-64 w-full" />
          ) : records.items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarXIcon />
                </EmptyMedia>
                <EmptyTitle>暂无签到记录</EmptyTitle>
                <EmptyDescription>该玩家还没有签到记录。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>签到时间</TableHead>
                    <TableHead className="text-right">当日名次</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.items.map((record, index) => (
                    <TableRow key={`${record.signInDate}-${index}`}>
                      <TableCell>{record.signInDate}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={record.rank <= 3 ? "default" : "outline"}>
                          第 {record.rank} 名
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  共 {records.total} 条记录，第 {records.page} / {totalPages} 页
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
