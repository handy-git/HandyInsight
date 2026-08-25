"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getDate,
  getDay,
  getDaysInMonth,
  startOfMonth,
} from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  AlertCircleIcon,
  CalendarCheckIcon,
  ClipboardListIcon,
  ClockIcon,
  CoinsIcon,
  CrownIcon,
  HammerIcon,
  LogInIcon,
  MapPinIcon,
  MedalIcon,
  PawPrintIcon,
  ShieldCheckIcon,
  TicketIcon,
} from "lucide-react";

import { StatTile } from "@/components/stat-tile";
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
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
import { McText } from "@/lib/common/mc-text";
import {
  fetchJson,
  formatDateTime,
  formatNumber,
  formatSeconds,
  secondsToHours,
} from "@/lib/common/format";
import type { Paginated } from "@/lib/common/types";
import type { SessionItem } from "@/lib/plugins/playertime/types";
import type { SignInRecord } from "@/lib/plugins/playersignin/types";
import type {
  TimelineEvent,
  UnifiedPlayerDetail,
} from "@/lib/common/unified";
import { cn } from "@/lib/utils";

const chartConfig = {
  hours: { label: "在线时长（小时）", color: "var(--chart-1)" },
} satisfies ChartConfig;

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

const EVENT_ICONS: Record<TimelineEvent["type"], typeof LogInIcon> = {
  login: LogInIcon,
  session: ClockIcon,
  signin: CalendarCheckIcon,
  guild: CrownIcon,
};

export default function UnifiedPlayerDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = use(params);
  const [detail, setDetail] = useState<UnifiedPlayerDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sessionPage, setSessionPage] = useState(1);
  const [sessions, setSessions] = useState<Paginated<SessionItem> | null>(null);
  const [timelinePage, setTimelinePage] = useState(1);
  const [recordPage, setRecordPage] = useState(1);
  const [records, setRecords] = useState<Paginated<SignInRecord> | null>(null);
  const uuid = detail?.uuid ?? null;

  useEffect(() => {
    Promise.all([
      fetchJson<UnifiedPlayerDetail>(
        `/api/players/${encodeURIComponent(key)}`,
      ),
      fetchJson<TimelineEvent[]>(
        `/api/players/${encodeURIComponent(key)}/timeline`,
      ),
    ])
      .then(([detailData, timelineData]) => {
        setDetail(detailData);
        setTimeline(timelineData);
      })
      .catch((err: Error) => setError(err.message));
  }, [key]);

  const loadSessions = useCallback(
    (nextPage: number) => {
      if (!uuid) return;
      fetchJson<Paginated<SessionItem>>(
        `/api/playertime/players/${uuid}/sessions?page=${nextPage}&pageSize=5`,
      )
        .then(setSessions)
        .catch(() => undefined);
    },
    [uuid],
  );

  useEffect(() => {
    loadSessions(sessionPage);
  }, [sessionPage, loadSessions]);

  const loadRecords = useCallback(
    (nextPage: number) => {
      if (!uuid) return;
      fetchJson<Paginated<SignInRecord>>(
        `/api/playersignin/players/${uuid}/records?page=${nextPage}&pageSize=5`,
      )
        .then(setRecords)
        .catch(() => undefined);
    },
    [uuid],
  );

  useEffect(() => {
    loadRecords(recordPage);
  }, [recordPage, loadRecords]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>加载玩家详情失败</AlertTitle>
        <AlertDescription>
          {error}
          <Link href="/overview/players" className="ml-2 underline">
            返回全服玩家
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

  const monthStart = startOfMonth(new Date());
  const daysInMonth = getDaysInMonth(monthStart);
  const leadingBlanks = (getDay(monthStart) + 6) % 7;
  const today = getDate(new Date());
  const signedDays = new Set(detail.signin?.monthDays ?? []);

  const chartData = (detail.playtime?.trend ?? []).map((point) => ({
    date: point.date.slice(5),
    hours: secondsToHours(point.seconds),
  }));
  const sessionTotalPages = sessions
    ? Math.max(1, Math.ceil(sessions.total / sessions.pageSize))
    : 1;
  const recordTotalPages = records
    ? Math.max(1, Math.ceil(records.total / records.pageSize))
    : 1;

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/overview/players" />}>
              全服玩家
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
                {detail.online ? (
                  <Badge>在线</Badge>
                ) : (
                  <Badge variant="outline">离线</Badge>
                )}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {detail.uuid && <span className="break-all">{detail.uuid}</span>}
              </span>
            </span>
          </CardTitle>
          {(detail.playertitle ||
            detail.companions ||
            detail.authme ||
            detail.task ||
            detail.playerwarp ||
            detail.playercurrency ||
            detail.intensify ||
            detail.guild) && (
            <div className="mt-4 flex flex-wrap gap-2.5">
              {detail.authme && (
                <StatTile
                  icon={ShieldCheckIcon}
                  label="账户"
                  value={detail.authme.ip ?? detail.authme.regIp ?? "—"}
                  hint={
                    detail.authme.lastLoginAt &&
                    `${formatDateTime(detail.authme.lastLoginAt)} 登录`
                  }
                />
              )}
              {detail.playertitle && (
                <StatTile
                  icon={MedalIcon}
                  label="称号"
                  value={
                    detail.playertitle.usingTitle ? (
                      <McText text={detail.playertitle.usingTitle} />
                    ) : (
                      `${detail.playertitle.titleCount} 个`
                    )
                  }
                />
              )}
              {detail.task && (
                <StatTile
                  icon={ClipboardListIcon}
                  label="任务"
                  value={`${detail.task.coins ?? "—"} 任务币`}
                  hint={`完成 ${
                    detail.task.dailyCompleted +
                    detail.task.npcCompleted +
                    detail.task.reelCompleted
                  } 个`}
                />
              )}
              {detail.playerwarp && (
                <StatTile
                  icon={MapPinIcon}
                  label="地标"
                  value={`${detail.playerwarp.warpCount} 个`}
                  hint={`上架 ${detail.playerwarp.displayedCount} 个 · 流量 ${detail.playerwarp.totalTp} 次`}
                />
              )}
              {detail.playercurrency && (
                <StatTile
                  icon={CoinsIcon}
                  label="货币"
                  value={`${detail.playercurrency.typeCount} 种`}
                  hint={
                    <>
                      {detail.playercurrency.topType
                        ? `${detail.playercurrency.topType} ${formatNumber(detail.playercurrency.topBalance)}`
                        : "—"}
                      {detail.playercurrency.lastChangeAt &&
                        ` · ${detail.playercurrency.lastChangeAt}`}
                    </>
                  }
                />
              )}
              {detail.companions && (
                <StatTile
                  icon={PawPrintIcon}
                  label="宠物"
                  value={`${detail.companions.totalCompanions} 只`}
                  hint={
                    detail.companions.activeCompanion &&
                    `出战 ${detail.companions.activeCompanion}`
                  }
                />
              )}
              {detail.intensify && (
                <StatTile
                  icon={HammerIcon}
                  label="强化"
                  value={`${detail.intensify.totalAttempts} 次`}
                  hint={`成功率 ${detail.intensify.successRate ?? "—"}% · 最高 +${detail.intensify.maxLevel}`}
                />
              )}
              {detail.guild && (
                <StatTile
                  icon={CrownIcon}
                  label="公会"
                  value={
                    <McText text={detail.guild.guildName} />
                  }
                  hint={`${detail.guild.role} · 总贡献 ${formatNumber(detail.guild.totalMoney)}`}
                />
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "总在线时长",
            value: detail.playtime
              ? formatSeconds(detail.playtime.totalSeconds)
              : "—",
          },
          {
            title: "累计签到",
            value: detail.signin ? `${detail.signin.totalSigns} 次` : "—",
          },
          {
            title: "连续签到",
            value: detail.signin ? `${detail.signin.streak} 天` : "—",
          },
          {
            title: "最近活跃",
            value: detail.lastActiveAt
              ? formatDateTime(detail.lastActiveAt)
              : "从未上线",
          },
        ].map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle
                className={
                  card.title === "最近活跃" && detail.lastActiveAt
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

      {timeline !== null && timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>活动时间线</CardTitle>
            <CardDescription>登录、会话与签到事件，按时间倒序</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ol className="flex flex-col gap-3">
              {timeline
                .slice((timelinePage - 1) * 5, timelinePage * 5)
                .map((event, index) => {
                  const Icon = EVENT_ICONS[event.type];
                  return (
                    <li
                      key={`${event.at}-${index}`}
                      className="flex items-start gap-3"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Icon className="size-4 text-muted-foreground" />
                      </span>
                      <span className="flex flex-col">
                        <span className="text-sm">{event.text}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(event.at) || event.at}
                        </span>
                      </span>
                    </li>
                  );
                })}
            </ol>
            {timeline.length > 5 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  共 {timeline.length} 条事件，第 {timelinePage} /{" "}
                  {Math.ceil(timeline.length / 5)} 页
                </span>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        aria-disabled={timelinePage <= 1}
                        className={
                          timelinePage <= 1
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                        onClick={() =>
                          setTimelinePage((prev) => Math.max(1, prev - 1))
                        }
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        aria-disabled={
                          timelinePage >= Math.ceil(timeline.length / 5)
                        }
                        className={
                          timelinePage >= Math.ceil(timeline.length / 5)
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                        onClick={() =>
                          setTimelinePage((prev) =>
                            Math.min(
                              Math.ceil(timeline.length / 5),
                              prev + 1,
                            ),
                          )
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {detail.playtime && (
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="size-4 text-muted-foreground" />
              在线时长 · PlayerTime
            </CardTitle>
            <CardDescription>
              今日 {formatSeconds(detail.playtime.todaySeconds)} · 本周{" "}
              {formatSeconds(detail.playtime.weekSeconds)} · 本月{" "}
              {formatSeconds(detail.playtime.monthSeconds)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <ChartContainer
              config={chartConfig}
              className="min-h-48 w-full flex-1"
            >
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                />
                <YAxis tickLine={false} axisLine={false} width={32} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="var(--color-hours)"
                  fill="var(--color-hours)"
                  fillOpacity={0.2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        )}

        {detail.signin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheckIcon className="size-4 text-muted-foreground" />
              签到 · PlayerSignIn
            </CardTitle>
            <CardDescription>
              本月已签到 {detail.signin.monthSigns} 天 · 连续{" "}
              {detail.signin.streak} 天 · 累计 {detail.signin.totalSigns} 次
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mx-auto grid w-full max-w-xs grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
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
                      signed &&
                        "bg-primary font-medium text-primary-foreground",
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
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {detail.playtime && (
        <Card>
          <CardHeader>
            <CardTitle>会话记录</CardTitle>
            <CardDescription>最近登录会话，按登录时间倒序</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {sessions === null ? (
              <Skeleton className="h-48 w-full" />
            ) : sessions.items.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>暂无会话记录</EmptyTitle>
                  <EmptyDescription>
                    该玩家还没有在线会话记录。
                  </EmptyDescription>
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
                        <TableCell>{formatDateTime(session.loginTime) || session.loginTime}</TableCell>
                        <TableCell>
                          {session.quitTime ? (
                            formatDateTime(session.quitTime)
                          ) : (
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
                    共 {sessions.total} 条会话，第 {sessions.page} /{" "}
                    {sessionTotalPages} 页
                  </span>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          aria-disabled={sessionPage <= 1}
                          className={
                            sessionPage <= 1
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                          onClick={() =>
                            setSessionPage((prev) => Math.max(1, prev - 1))
                          }
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          aria-disabled={sessionPage >= sessionTotalPages}
                          className={
                            sessionPage >= sessionTotalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                          onClick={() =>
                            setSessionPage((prev) =>
                              Math.min(sessionTotalPages, prev + 1),
                            )
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
        )}

        {detail.signin && (
        <Card>
          <CardHeader>
            <CardTitle>签到记录</CardTitle>
            <CardDescription>按签到时间倒序</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {records === null ? (
              <Skeleton className="h-48 w-full" />
            ) : records.items.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>暂无签到记录</EmptyTitle>
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
                        <TableCell>{formatDateTime(record.signInDate) || record.signInDate}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={record.rank <= 3 ? "default" : "outline"}
                          >
                            第 {record.rank} 名
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    共 {records.total} 条记录，第 {records.page} /{" "}
                    {recordTotalPages} 页
                  </span>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          aria-disabled={recordPage <= 1}
                          className={
                            recordPage <= 1
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                          onClick={() =>
                            setRecordPage((prev) => Math.max(1, prev - 1))
                          }
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          aria-disabled={recordPage >= recordTotalPages}
                          className={
                            recordPage >= recordTotalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                          onClick={() =>
                            setRecordPage((prev) =>
                              Math.min(recordTotalPages, prev + 1),
                            )
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
        )}
      </div>

      {detail.signin && (
        <>
        {detail.signin.cards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TicketIcon className="size-4 text-muted-foreground" />
                补签卡
              </CardTitle>
              <CardDescription>该玩家持有的虚拟补签卡</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类型</TableHead>
                    <TableHead>可用月份</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.signin.cards.map((card, index) => (
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
            </CardContent>
          </Card>
        )}
        </>
      )}
      {detail.task && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardListIcon className="size-4 text-muted-foreground" />
              任务 · PlayerTask
            </CardTitle>
            <CardDescription>
              每日完成 {detail.task.dailyCompleted} 个 · NPC 完成{" "}
              {detail.task.npcCompleted} 个 · 卷轴完成{" "}
              {detail.task.reelCompleted} 个
              {detail.task.lastTaskAt && (
                <>
                  {" "}
                  · 最近任务 {formatDateTime(detail.task.lastTaskAt)}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "任务币",
                  value:
                    detail.task.coins === null
                      ? "—"
                      : formatNumber(detail.task.coins),
                },
                {
                  title: "每日完成",
                  value: `${detail.task.dailyCompleted} 个`,
                },
                {
                  title: "NPC 完成",
                  value: `${detail.task.npcCompleted} 个`,
                },
                {
                  title: "卷轴完成",
                  value: `${detail.task.reelCompleted} 个`,
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
          </CardContent>
        </Card>
      )}
      {detail.playerwarp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinIcon className="size-4 text-muted-foreground" />
              地标 · PlayerWarp
            </CardTitle>
            <CardDescription>
              创建 {detail.playerwarp.warpCount} 个 · 上架{" "}
              {detail.playerwarp.displayedCount} 个 · 总流量{" "}
              {detail.playerwarp.totalTp} 次
              {detail.playerwarp.lastCreateAt && (
                <>
                  {" "}
                  · 最近创建 {formatDateTime(detail.playerwarp.lastCreateAt)}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "创建地标",
                  value: `${detail.playerwarp.warpCount} 个`,
                },
                {
                  title: "上架地标",
                  value: `${detail.playerwarp.displayedCount} 个`,
                },
                {
                  title: "地标总流量",
                  value: formatNumber(detail.playerwarp.totalTp),
                },
                {
                  title: "最近创建",
                  value: detail.playerwarp.lastCreateAt
                    ? formatDateTime(detail.playerwarp.lastCreateAt)
                    : "—",
                },
              ].map((card) => (
                <Card key={card.title}>
                  <CardHeader>
                    <CardDescription>{card.title}</CardDescription>
                    <CardTitle
                      className={
                        card.title === "最近创建"
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
          </CardContent>
        </Card>
      )}
      {detail.playercurrency && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CoinsIcon className="size-4 text-muted-foreground" />
              货币 · PlayerCurrency
            </CardTitle>
            <CardDescription>
              持有 {detail.playercurrency.typeCount} 种货币
              {detail.playercurrency.topType && (
                <>
                  {" "}
                  · 主货币 {detail.playercurrency.topType}{" "}
                  {formatNumber(detail.playercurrency.topBalance)}</>
              )}
              {detail.playercurrency.lastChangeAt && (
                <>
                  {" "}
                  · 最近变动 {formatDateTime(detail.playercurrency.lastChangeAt)}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "货币类型",
                  value: `${detail.playercurrency.typeCount} 种`,
                },
                {
                  title: "余额最高货币",
                  value: detail.playercurrency.topType ?? "—",
                },
                {
                  title: "主货币余额",
                  value: formatNumber(detail.playercurrency.topBalance),
                },
                {
                  title: "最近变动",
                  value: detail.playercurrency.lastChangeAt
                    ? formatDateTime(detail.playercurrency.lastChangeAt)
                    : "—",
                },
              ].map((card) => (
                <Card key={card.title}>
                  <CardHeader>
                    <CardDescription>{card.title}</CardDescription>
                    <CardTitle
                      className={
                        card.title === "最近变动" ||
                        card.title === "余额最高货币"
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
          </CardContent>
        </Card>
      )}
      {detail.intensify && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HammerIcon className="size-4 text-muted-foreground" />
              强化 · PlayerIntensify
            </CardTitle>
            <CardDescription>
              成功率 {detail.intensify.successRate ?? "—"}% · 最高等级 +
              {detail.intensify.maxLevel}
              {detail.intensify.maxLevelName && (
                <>
                  {" "}
                  · 装备 <McText text={detail.intensify.maxLevelName} />
                </>
              )}
              {detail.intensify.materialName &&
                `（${detail.intensify.materialName}）`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "强化总次数",
                  value: `${detail.intensify.totalAttempts} 次`,
                },
                {
                  title: "成功次数",
                  value: `${detail.intensify.succeedNum} 次`,
                },
                {
                  title: "掉级次数",
                  value: `${detail.intensify.levelOffNum} 次`,
                },
                {
                  title: "消失次数",
                  value: `${detail.intensify.vanishNum} 次`,
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
          </CardContent>
        </Card>
      )}
      {detail.guild && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CrownIcon className="size-4 text-muted-foreground" />
              公会 · PlayerGuild
            </CardTitle>
            <CardDescription>
              所属{" "}
              <Link
                href={`/guild/list/${detail.guild.guildId}`}
                className="underline underline-offset-2"
              >
                <McText text={detail.guild.guildName} />
              </Link>{" "}
              · 等级 {detail.guild.guildLevel} · {detail.guild.role}
              {detail.guild.joinTime && (
                <> · 加入于 {formatDateTime(detail.guild.joinTime)}</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "当前贡献",
                  value: formatNumber(detail.guild.money),
                },
                {
                  title: "周贡献",
                  value: formatNumber(detail.guild.weekMoney),
                },
                {
                  title: "总贡献",
                  value: formatNumber(detail.guild.totalMoney),
                },
                {
                  title: "矿石",
                  value: `${formatNumber(detail.guild.ore)} 个`,
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
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span>
                公会战击杀 {formatNumber(detail.guild.kill)} 次 · 死亡{" "}
                {formatNumber(detail.guild.die)} 次
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
