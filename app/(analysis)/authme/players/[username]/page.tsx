"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircleIcon } from "lucide-react";

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
import type { AuthmeAccountDetail } from "@/lib/plugins/authme/types";

export default function AuthmeAccountDetailPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const [detail, setDetail] = useState<AuthmeAccountDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<AuthmeAccountDetail>(
      `/api/authme/players/${encodeURIComponent(username)}`,
    )
      .then(setDetail)
      .catch((err: Error) => setError(err.message));
  }, [username]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>加载账户详情失败</AlertTitle>
        <AlertDescription>
          {error}
          <Link href="/authme/players" className="ml-2 underline">
            返回账户列表
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

  const location = `${detail.world}（${Math.round(detail.x)}, ${Math.round(
    detail.y,
  )}, ${Math.round(detail.z)}）`;

  const infoRows: { label: string; value: string }[] = [
    { label: "登录名", value: detail.username },
    { label: "邮箱", value: detail.email ?? "—" },
    { label: "注册 IP", value: detail.regIp ?? "—" },
    { label: "最近登录 IP", value: detail.ip ?? "—" },
    { label: "保持会话", value: detail.hasSession ? "是" : "否" },
    { label: "最后位置", value: location },
    {
      label: "朝向",
      value:
        detail.yaw === null
          ? "—"
          : `水平 ${Math.round(detail.yaw)}° / 俯仰 ${
              detail.pitch === null ? "—" : Math.round(detail.pitch)
            }°`,
    },
  ];

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/authme/players" />}>
              账户列表
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{detail.realname}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {detail.realname}
            {detail.logged ? (
              <Badge>登录中</Badge>
            ) : (
              <Badge variant="outline">离线</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {detail.lastLoginAt
              ? `最近登录于 ${detail.lastLoginAt}`
              : "从未登录过"}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "注册时间", value: detail.regDate ?? "—" },
          { title: "最近登录", value: detail.lastLoginAt ?? "从未登录" },
          {
            title: "登录状态",
            value: detail.logged ? "登录中" : "离线",
          },
          { title: "最后位置", value: location },
        ].map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-lg break-all">
                {card.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>账户信息</CardTitle>
          <CardDescription>
            认证相关的账户资料（出于安全考虑不展示密码与两步验证信息）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">项目</TableHead>
                <TableHead>内容</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {infoRows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="text-muted-foreground">
                    {row.label}
                  </TableCell>
                  <TableCell className="font-medium break-all">
                    {row.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
