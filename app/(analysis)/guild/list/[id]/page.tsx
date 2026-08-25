"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  CalendarCheckIcon,
  CoinsIcon,
  CrownIcon,
  GemIcon,
  SearchIcon,
  ShoppingCartIcon,
  SwordsIcon,
  UsersIcon,
} from "lucide-react";

import { SortableHead } from "@/components/sortable-head";
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
import { fetchJson, formatNumber } from "@/lib/common/format";
import { McText } from "@/lib/common/mc-text";
import { toggleSort, type SortOrder } from "@/lib/common/sort";
import type { Paginated } from "@/lib/common/types";
import {
  GUILD_MEMBER_DEFAULT_ORDER,
  type GuildDetail,
  type GuildMemberItem,
  type GuildMemberSortField,
} from "@/lib/plugins/playerguild/types";

export default function GuildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [detail, setDetail] = useState<GuildDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<GuildDetail>(`/api/guild/${encodeURIComponent(id)}`)
      .then((data) => {
        setDetail(data);
        setNotFound(false);
      })
      .catch((err: Error) => {
        if (err.message.includes("404") || err.message.includes("未找到")) {
          setNotFound(true);
        } else {
          setError(err.message);
        }
      });
  }, [id]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>加载公会失败</AlertTitle>
        <AlertDescription>
          {error}
          <Link href="/guild/list" className="ml-2 underline">
            返回公会列表
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (notFound) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CrownIcon />
          </EmptyMedia>
          <EmptyTitle>未找到该公会</EmptyTitle>
          <EmptyDescription>
            <Link href="/guild/list" className="underline">
              返回公会列表
            </Link>
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/guild/list">公会列表</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{detail.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <CrownIcon className="size-5 text-muted-foreground" />
            <McText text={detail.name} />
            <Badge variant="outline">等级 {formatNumber(detail.level)}</Badge>
            {detail.sacredStoneLevel > 1 && (
              <Badge variant="outline">
                <GemIcon data-icon="inline-start" />
                神石 {formatNumber(detail.sacredStoneLevel)} 级
              </Badge>
            )}
            {detail.seasonRank > 0 && (
              <Badge>赛季 #{formatNumber(detail.seasonRank)}</Badge>
            )}
            {detail.joinMode ? (
              <Badge variant="outline" className="text-muted-foreground">
                需审批加入
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                免审批加入
              </Badge>
            )}
            <Badge
              variant={detail.pvpStatus ? "default" : "outline"}
              className={detail.pvpStatus ? "" : "text-muted-foreground"}
            >
              PVP {detail.pvpStatus ? "开启" : "关闭"}
            </Badge>
          </CardTitle>
          <CardDescription>
            会长 {detail.creator ?? "—"}
            {detail.createTime && ` · 创建于 ${detail.createTime}`}
            {detail.description && ` · ${detail.description}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "成员",
                value: `${formatNumber(detail.memberTotal)}${
                  detail.memberMaxCount > 0
                    ? ` / ${formatNumber(detail.memberMaxCount)}`
                    : ""
                }`,
              },
              { title: "公会资金", value: formatNumber(detail.money) },
              { title: "活跃度", value: formatNumber(detail.prosperityDegree) },
              {
                title: "月度活跃",
                value: formatNumber(detail.monthProsperityDegree),
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

      {/* key 绑定公会 id：切换公会时整个面板重挂载，筛选/排序/页码自然重置 */}
      <GuildMembersPanel
        key={detail.id}
        guildId={detail.id}
        memberTotal={detail.memberTotal}
      />

      {detail.applyStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheckIcon className="size-4 text-muted-foreground" />
              申请记录
            </CardTitle>
            <CardDescription>
              共 {formatNumber(detail.applyStats.total)} 次申请 · 通过{" "}
              {formatNumber(detail.applyStats.approved)} · 拒绝{" "}
              {formatNumber(detail.applyStats.rejected)} · 待审批{" "}
              {formatNumber(detail.applyStats.pending)} · 已取消{" "}
              {formatNumber(detail.applyStats.cancelled)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {detail.recentApplies && detail.recentApplies.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>申请人</TableHead>
                    <TableHead>申请时间</TableHead>
                    <TableHead>审批结果</TableHead>
                    <TableHead>审批人</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.recentApplies.map((apply, index) => (
                    <TableRow key={`${apply.playerName}-${index}`}>
                      <TableCell className="font-medium">
                        {apply.playerName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {apply.applyTime ?? "—"}
                      </TableCell>
                      <TableCell>
                        {apply.result === "approved" ? (
                          <Badge>已通过</Badge>
                        ) : apply.result === "rejected" ? (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            已拒绝
                          </Badge>
                        ) : apply.result === "pending" ? (
                          <Badge variant="outline">待审批</Badge>
                        ) : apply.result === "cancelled" ? (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            已取消
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">已处理</span>
                        )}
                      </TableCell>
                      <TableCell>{apply.approverName ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarCheckIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无申请记录</EmptyTitle>
                  <EmptyDescription>还没有玩家申请加入该公会。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {detail.pvpLogs && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SwordsIcon className="size-4 text-muted-foreground" />
                公会战记录
              </CardTitle>
              <CardDescription>该公会参加的公会战</CardDescription>
            </CardHeader>
            <CardContent>
              {detail.pvpLogs.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <SwordsIcon />
                    </EmptyMedia>
                    <EmptyTitle>暂无公会战记录</EmptyTitle>
                    <EmptyDescription>该公会还没有参加过公会战。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>类型</TableHead>
                      <TableHead>赛季</TableHead>
                      <TableHead>结果</TableHead>
                      <TableHead className="text-right">排名</TableHead>
                      <TableHead>开始时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.pvpLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant="outline">
                            <McText text={log.type} />
                          </Badge>
                        </TableCell>
                        <TableCell>{log.season ?? "—"}</TableCell>
                        <TableCell>
                          {log.result === "win" ? (
                            <Badge>胜</Badge>
                          ) : log.result === "lose" ? (
                            <Badge
                              variant="outline"
                              className="text-muted-foreground"
                            >
                              负
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {log.rank ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.startTime ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {detail.pvpPlayerRanking && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SwordsIcon className="size-4 text-muted-foreground" />
                公会战 K/D 排行
              </CardTitle>
              <CardDescription>按公会战累计击杀统计前 10 名</CardDescription>
            </CardHeader>
            <CardContent>
              {detail.pvpPlayerRanking.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <SwordsIcon />
                    </EmptyMedia>
                    <EmptyTitle>暂无战斗数据</EmptyTitle>
                    <EmptyDescription>该公会还没有玩家参战记录。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">名次</TableHead>
                      <TableHead>玩家</TableHead>
                      <TableHead className="text-right">场次</TableHead>
                      <TableHead className="text-right">击杀</TableHead>
                      <TableHead className="text-right">死亡</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.pvpPlayerRanking.map((entry, index) => (
                      <TableRow
                        key={entry.uuid || entry.playerName}
                        className="cursor-pointer"
                        onClick={() =>
                          entry.uuid &&
                          router.push(`/overview/players/${entry.uuid}`)
                        }
                      >
                        <TableCell>
                          <Badge variant={index < 3 ? "default" : "outline"}>
                            {index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.playerName}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(entry.battles)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(entry.kill)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(entry.die)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {detail.recentShopLogs && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCartIcon className="size-4 text-muted-foreground" />
              商店购买记录
            </CardTitle>
            <CardDescription>
              累计购买{" "}
              {detail.totalShopPurchases !== null
                ? formatNumber(detail.totalShopPurchases)
                : "—"}{" "}
              次 · 最近 20 条
            </CardDescription>
          </CardHeader>
          <CardContent>
            {detail.recentShopLogs.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CoinsIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无购买记录</EmptyTitle>
                  <EmptyDescription>该公会还没有玩家购买记录。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>玩家</TableHead>
                    <TableHead className="text-right">购买次数</TableHead>
                    <TableHead>购买时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.recentShopLogs.map((log, index) => (
                    <TableRow key={`${log.playerName}-${index}`}>
                      <TableCell className="font-medium">
                        {log.playerName}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(log.number)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.buyTime ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

/* ---------- 成员列表面板：搜索 + 服务端分页 + 动态排序 ---------- */

function GuildMembersPanel({
  guildId,
  memberTotal,
}: {
  guildId: number;
  memberTotal: number;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<GuildMemberSortField>("totalMoney");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [members, setMembers] = useState<Paginated<GuildMemberItem> | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);

  const loadMembers = useCallback(() => {
    const params = new URLSearchParams({
      page: String(page),
      sort,
      order,
    });
    if (keyword) params.set("keyword", keyword);
    fetchJson<Paginated<GuildMemberItem>>(
      `/api/guild/${encodeURIComponent(guildId)}/members?${params.toString()}`,
    )
      .then(setMembers)
      .catch((err: Error) => setMembersError(err.message));
  }, [guildId, page, sort, order, keyword]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  function handleSearch() {
    setPage(1);
    setKeyword(input.trim());
  }

  function handleSort(field: GuildMemberSortField) {
    const next = toggleSort(
      { field: sort, order },
      field,
      GUILD_MEMBER_DEFAULT_ORDER[field],
    );
    setSort(next.field);
    setOrder(next.order);
    setPage(1);
  }

  const memberTotalPages = members
    ? Math.max(1, Math.ceil(members.total / members.pageSize))
    : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersIcon className="size-4 text-muted-foreground" />
          成员列表
        </CardTitle>
        <CardDescription>
          共 {formatNumber(memberTotal)} 名成员，默认按总贡献排序，点击查看玩家详情
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <InputGroup className="max-w-sm">
          <InputGroupInput
            placeholder="搜索成员名称"
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

        {membersError ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>成员加载失败</AlertTitle>
            <AlertDescription>{membersError}</AlertDescription>
          </Alert>
        ) : members === null ? (
          <Skeleton className="h-72 w-full" />
        ) : members.items.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>没有找到成员</EmptyTitle>
              <EmptyDescription>
                {keyword ? "没有符合筛选条件的成员。" : "该公会还没有成员。"}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead<GuildMemberSortField>
                    label="成员"
                    field="name"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <SortableHead<GuildMemberSortField>
                    label="角色"
                    field="role"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <SortableHead<GuildMemberSortField>
                    label="当前贡献"
                    field="money"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<GuildMemberSortField>
                    label="周贡献"
                    field="weekMoney"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<GuildMemberSortField>
                    label="总贡献"
                    field="totalMoney"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<GuildMemberSortField>
                    label="矿石"
                    field="ore"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<GuildMemberSortField>
                    label="击杀 / 死亡"
                    field="kill"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHead<GuildMemberSortField>
                    label="最近上线"
                    field="lastJoin"
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.items.map((member) => (
                  <TableRow
                    key={member.uuid || member.name}
                    className="cursor-pointer"
                    onClick={() =>
                      member.uuid &&
                      router.push(`/overview/players/${member.uuid}`)
                    }
                  >
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <Avatar size="sm">
                          <AvatarImage
                            src={playerAvatarUrl(member.name, 32)}
                            alt={member.name}
                          />
                          <AvatarFallback>
                            {member.name.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {member.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      {member.role === "会长" ? (
                        <Badge>会长</Badge>
                      ) : member.role === "管理员" ? (
                        <Badge variant="outline">管理员</Badge>
                      ) : (
                        <span className="text-muted-foreground">成员</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(member.money)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(member.weekMoney)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(member.totalMoney)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(member.ore)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(member.kill)} / {formatNumber(member.die)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.lastJoinTime ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                共 {formatNumber(members.total)} 名成员，第 {members.page} /{" "}
                {memberTotalPages} 页
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
                      aria-disabled={page >= memberTotalPages}
                      className={
                        page >= memberTotalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                      onClick={() =>
                        setPage((prev) => Math.min(memberTotalPages, prev + 1))
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
