"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  KeyRoundIcon,
  ListChecksIcon,
  ScrollTextIcon,
  ShieldIcon,
  UsersIcon,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchJson, formatNumber } from "@/lib/common/format";
import { McText } from "@/lib/common/mc-text";
import type { LuckPermsOverview } from "@/lib/plugins/luckperms/types";

export default function LuckPermsDashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<LuckPermsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<LuckPermsOverview>("/api/luckperms/overview")
      .then(setOverview)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>数据加载失败</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "权限玩家", value: overview?.totalPlayers, suffix: "人" },
          { title: "权限组数", value: overview?.totalGroups, suffix: "个" },
          {
            title: "组权限总数",
            value: overview?.totalGroupPermissions,
            suffix: "条",
          },
          {
            title: "直接权限玩家",
            value: overview?.totalDirectPlayers,
            suffix: "人",
          },
        ].map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-2xl">
                {card.value === undefined ? (
                  <Skeleton className="h-8 w-24" />
                ) : card.value === null ? (
                  "—"
                ) : (
                  <>
                    {formatNumber(card.value)}
                    {card.suffix && (
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        {card.suffix}
                      </span>
                    )}
                  </>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="size-4 text-muted-foreground" />
              组人数分布
            </CardTitle>
            <CardDescription>按主权限组统计玩家数前 10 名</CardDescription>
          </CardHeader>
          <CardContent>
            {overview === null ? (
              <Skeleton className="h-48 w-full" />
            ) : overview.groupDistribution.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <UsersIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无玩家分组</EmptyTitle>
                  <EmptyDescription>还没有玩家被分配权限组。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">名次</TableHead>
                    <TableHead>权限组</TableHead>
                    <TableHead className="text-right">玩家数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.groupDistribution.map((entry, index) => (
                    <TableRow
                      key={entry.name}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/luckperms/groups/${encodeURIComponent(entry.name)}`,
                        )
                      }
                    >
                      <TableCell>
                        <Badge variant={index < 3 ? "default" : "outline"}>
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <McText text={entry.name} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(entry.memberCount)}
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
              <ListChecksIcon className="size-4 text-muted-foreground" />
              权限数排行
            </CardTitle>
            <CardDescription>按权限节点数量统计前 10 名</CardDescription>
          </CardHeader>
          <CardContent>
            {overview === null ? (
              <Skeleton className="h-48 w-full" />
            ) : overview.topPermissionGroups.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <KeyRoundIcon />
                  </EmptyMedia>
                  <EmptyTitle>暂无组权限</EmptyTitle>
                  <EmptyDescription>还没有权限组配置权限节点。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">名次</TableHead>
                    <TableHead>权限组</TableHead>
                    <TableHead className="text-right">权限数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.topPermissionGroups.map((entry, index) => (
                    <TableRow
                      key={entry.name}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/luckperms/groups/${encodeURIComponent(entry.name)}`,
                        )
                      }
                    >
                      <TableCell>
                        <Badge variant={index < 3 ? "default" : "outline"}>
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <McText text={entry.name} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(entry.count)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {overview?.recentActions && overview.recentActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollTextIcon className="size-4 text-muted-foreground" />
              最近操作
            </CardTitle>
            <CardDescription>最近的权限变更记录</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>操作者</TableHead>
                  <TableHead>对象类型</TableHead>
                  <TableHead>操作对象</TableHead>
                  <TableHead>操作内容</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.recentActions.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground">
                      {log.time}
                    </TableCell>
                    <TableCell>{log.actorName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.type}</Badge>
                    </TableCell>
                    <TableCell>{log.actedName ?? "—"}</TableCell>
                    <TableCell className="max-w-md truncate">
                      <McText text={log.action} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {overview !== null && overview.totalActions !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldIcon className="size-4 text-muted-foreground" />
              操作统计
            </CardTitle>
            <CardDescription>累计操作记录数</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-2xl font-semibold">
              {formatNumber(overview.totalActions)}
              <span className="text-sm font-normal text-muted-foreground">
                条
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
