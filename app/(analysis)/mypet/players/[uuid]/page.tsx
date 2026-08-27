"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircleIcon, EggIcon } from "lucide-react";

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
import type { MypetPlayerDetail } from "@/lib/plugins/mypet/types";

export default function MypetPlayerDetailPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const [detail, setDetail] = useState<MypetPlayerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<MypetPlayerDetail>(
      `/api/mypet/players/${encodeURIComponent(uuid)}`,
    )
      .then(setDetail)
      .catch((err: Error) => setError(err.message));
  }, [uuid]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>加载宠物详情失败</AlertTitle>
        <AlertDescription>
          {error}
          <Link href="/mypet/players" className="ml-2 underline">
            返回宠物玩家
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

  const spawnedCount = detail.pets.filter((pet) => pet.wantsToSpawn).length;
  const maxExp = Math.max(...detail.pets.map((pet) => pet.exp), 0);
  const lastUsedAt = detail.pets.reduce<string | null>(
    (latest, pet) => (pet.lastUsedAt && pet.lastUsedAt > (latest ?? "") ? pet.lastUsedAt : latest),
    null,
  );

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/mypet/players" />}>
              宠物玩家
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
                {spawnedCount > 0 && (
                  <Badge>
                    <EggIcon data-icon="inline-start" />
                    {spawnedCount} 只出战
                  </Badge>
                )}
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
          { title: "拥有宠物", value: `${detail.pets.length} 只` },
          {
            title: "出战宠物",
            value: `${spawnedCount} 只`,
          },
          {
            title: "最高经验",
            value: `${formatNumber(maxExp)} EXP`,
          },
          {
            title: "最后使用",
            value: lastUsedAt ?? "—",
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

      <Card>
        <CardHeader>
          <CardTitle>宠物列表</CardTitle>
          <CardDescription>按经验降序（宠物名以二进制存储，不做解码展示）</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>类型</TableHead>
                <TableHead className="text-right">经验</TableHead>
                <TableHead className="text-right">生命</TableHead>
                <TableHead className="text-right">饥饿</TableHead>
                <TableHead>世界组</TableHead>
                <TableHead>技能树</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最后使用</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.pets.map((pet) => (
                <TableRow key={pet.uuid}>
                  <TableCell className="font-medium">{pet.type}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(pet.exp)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(pet.health)}
                  </TableCell>
                  <TableCell className="text-right">{pet.hunger}</TableCell>
                  <TableCell>{pet.worldGroup ?? "—"}</TableCell>
                  <TableCell>{pet.skilltree ?? "—"}</TableCell>
                  <TableCell>
                    {pet.wantsToSpawn ? (
                      <Badge>出战</Badge>
                    ) : (
                      <span className="text-muted-foreground">休息</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {pet.lastUsedAt ?? "—"}
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
