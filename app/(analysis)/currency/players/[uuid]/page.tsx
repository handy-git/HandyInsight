"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircleIcon,
  CoinsIcon,
  HistoryIcon,
  WalletIcon,
} from "lucide-react";

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
import type { CurrencyPlayerDetail } from "@/lib/plugins/playercurrency/types";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export default function CurrencyPlayerDetailPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const [detail, setDetail] = useState<CurrencyPlayerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<CurrencyPlayerDetail>(
      `/api/currency/players/${encodeURIComponent(uuid)}`,
    )
      .then(setDetail)
      .catch((err: Error) => setError(err.message));
  }, [uuid]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>加载货币详情失败</AlertTitle>
        <AlertDescription>
          {error}
          <Link href="/currency/players" className="ml-2 underline">
            返回货币玩家
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
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const topBalance = detail.balances[0] ?? null;
  const lastChangeAt =
    detail.logs.length > 0 ? detail.logs[0].operatorTime : null;

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/currency/players" />}>
              货币玩家
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
                src={playerAvatarUrl(detail.name, 64)}
                alt={detail.name}
              />
              <AvatarFallback>
                {detail.name.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="flex flex-col gap-1">
              <span className="flex items-center gap-2">
                {detail.name}
                <Badge>
                  <CoinsIcon data-icon="inline-start" />
                  {detail.balances.length} 种货币
                </Badge>
              </span>
              <span className="break-all text-xs font-normal text-muted-foreground">
                {detail.uuid}
              </span>
            </span>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "货币类型",
            value: `${detail.balances.length} 种`,
          },
          {
            title: "总余额（跨类型合计）",
            value: formatNumber(
              detail.balances.reduce((sum, item) => sum + item.balance, 0),
            ),
          },
          {
            title: "余额最高货币",
            value: topBalance
              ? `${topBalance.type} · ${formatNumber(topBalance.balance)}`
              : "—",
          },
          {
            title: "最近变动",
            value: lastChangeAt ?? "—",
          },
        ].map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle
                className={
                  card.title === "最近变动" || card.title === "余额最高货币"
                    ? "text-lg whitespace-nowrap"
                    : "text-2xl"
                }
              >
                {card.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WalletIcon className="size-4 text-muted-foreground" />
            货币余额
          </CardTitle>
          <CardDescription>该玩家持有的各类型货币余额与累计总量</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.balances.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <WalletIcon />
                </EmptyMedia>
                <EmptyTitle>暂无货币</EmptyTitle>
                <EmptyDescription>该玩家还没有持有货币。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>货币类型</TableHead>
                  <TableHead className="text-right">当前余额</TableHead>
                  <TableHead className="text-right">累计总量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.balances.map((item) => (
                  <TableRow key={item.type}>
                    <TableCell>
                      <Badge variant="outline">{item.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(item.balance)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatNumber(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="size-4 text-muted-foreground" />
            变更记录
          </CardTitle>
          <CardDescription>该玩家最近 50 条货币变更记录</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.logs.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HistoryIcon />
                </EmptyMedia>
                <EmptyTitle>暂无变更记录</EmptyTitle>
                <EmptyDescription>该玩家还没有货币变更记录。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
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
                {detail.logs.map((log) => (
                  <TableRow key={log.id}>
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
          )}
        </CardContent>
      </Card>
    </>
  );
}
