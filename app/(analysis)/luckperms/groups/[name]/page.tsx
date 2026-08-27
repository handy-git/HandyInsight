"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  KeyRoundIcon,
  SearchIcon,
  UsersIcon,
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
import type { Paginated } from "@/lib/common/types";
import type {
  LuckPermsGroupDetail,
  LuckPermsGroupMember,
} from "@/lib/plugins/luckperms/types";

export default function LuckPermsGroupDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const router = useRouter();
  const [detail, setDetail] = useState<LuckPermsGroupDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<LuckPermsGroupDetail>(`/api/luckperms/groups/${encodeURIComponent(name)}`)
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
  }, [name]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>加载权限组失败</AlertTitle>
        <AlertDescription>
          {error}
          <Link href="/luckperms/groups" className="ml-2 underline">
            返回权限组列表
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
            <KeyRoundIcon />
          </EmptyMedia>
          <EmptyTitle>未找到该权限组</EmptyTitle>
          <EmptyDescription>
            <Link href="/luckperms/groups" className="underline">
              返回权限组列表
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
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/luckperms/groups">权限组列表</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              <McText text={detail.name} />
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-5 text-muted-foreground" />
            <McText text={detail.name} />
          </CardTitle>
          <CardDescription>权限组配置概览</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { title: "组内玩家", value: formatNumber(detail.memberCount) },
              { title: "权限节点", value: formatNumber(detail.permissionCount) },
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

      {/* key 绑定组名：切换权限组时面板重挂载，筛选/页码自然重置 */}
      <GroupMembersPanel
        key={detail.name}
        groupName={detail.name}
        memberTotal={detail.memberCount}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-4 text-muted-foreground" />
            组权限
          </CardTitle>
          <CardDescription>
            共 {formatNumber(detail.permissionCount)} 条权限节点
          </CardDescription>
        </CardHeader>
        <CardContent>
          {detail.permissions.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <KeyRoundIcon />
                </EmptyMedia>
                <EmptyTitle>暂无权限节点</EmptyTitle>
                <EmptyDescription>该权限组还没有配置任何权限。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>权限节点</TableHead>
                  <TableHead>值</TableHead>
                  <TableHead>服务器</TableHead>
                  <TableHead>世界</TableHead>
                  <TableHead>过期时间</TableHead>
                  <TableHead>上下文</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.permissions.map((perm, index) => (
                  <TableRow key={`${perm.permission}-${index}`}>
                    <TableCell className="font-medium max-w-md truncate">
                      <McText text={perm.permission} />
                    </TableCell>
                    <TableCell>
                      {perm.value ? (
                        <Badge>允许</Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          拒绝
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {perm.server ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {perm.world ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {perm.expiry ?? "永久"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {perm.contexts ?? "—"}
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

/* ---------- 组内成员面板：搜索 + 服务端分页 ---------- */

function GroupMembersPanel({
  groupName,
  memberTotal,
}: {
  groupName: string;
  memberTotal: number;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [members, setMembers] = useState<Paginated<LuckPermsGroupMember> | null>(
    null,
  );
  const [membersError, setMembersError] = useState<string | null>(null);

  const loadMembers = useCallback(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (keyword) params.set("keyword", keyword);
    fetchJson<Paginated<LuckPermsGroupMember>>(
      `/api/luckperms/groups/${encodeURIComponent(groupName)}/members?${params.toString()}`,
    )
      .then(setMembers)
      .catch((err: Error) => setMembersError(err.message));
  }, [groupName, page, keyword]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  function handleSearch() {
    setPage(1);
    setKeyword(input.trim());
  }

  const totalPages = members
    ? Math.max(1, Math.ceil(members.total / members.pageSize))
    : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersIcon className="size-4 text-muted-foreground" />
          组内成员
        </CardTitle>
        <CardDescription>
          共 {formatNumber(memberTotal)} 名成员，点击查看玩家详情
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
                {keyword ? "没有符合筛选条件的成员。" : "该权限组还没有成员。"}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>成员</TableHead>
                  <TableHead>UUID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.items.map((member) => (
                  <TableRow
                    key={member.uuid}
                    className="cursor-pointer"
                    onClick={() => router.push(`/overview/players/${member.uuid}`)}
                  >
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <Avatar size="sm">
                          <AvatarImage
                            src={playerAvatarUrl(member.username, 32)}
                            alt={member.username}
                          />
                          <AvatarFallback>
                            {member.username.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {member.username}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.uuid}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                共 {formatNumber(members.total)} 名成员，第 {members.page} /{" "}
                {totalPages} 页
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
