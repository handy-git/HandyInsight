"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircleIcon, PawPrintIcon } from "lucide-react";

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
import { McText } from "@/lib/common/mc-text";
import { fetchJson, formatNumber } from "@/lib/common/format";
import type { CompanionsPlayerDetail } from "@/lib/plugins/companions/types";

export default function CompanionsPlayerDetailPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const [detail, setDetail] = useState<CompanionsPlayerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<CompanionsPlayerDetail>(
      `/api/companions/players/${encodeURIComponent(uuid)}`,
    )
      .then(setDetail)
      .catch((err: Error) => setError(err.message));
  }, [uuid]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>加载小精灵详情失败</AlertTitle>
        <AlertDescription>
          {error}
          <Link href="/companions/players" className="ml-2 underline">
            返回小精灵玩家
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

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/companions/players" />}>
              小精灵玩家
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
                {detail.activeCompanion && (
                  <Badge>
                    <PawPrintIcon data-icon="inline-start" />
                    出战中 · {detail.activeCompanion}
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
          { title: "拥有小精灵", value: `${detail.companions.length} 只` },
          {
            title: "小精灵货币",
            value:
              detail.coins === null
                ? "—"
                : formatNumber(detail.coins),
          },
          {
            title: "最高能力等级",
            value: `Lv.${Math.max(
              ...detail.companions.map((companion) => companion.abilityLevel),
              0,
            )}`,
          },
          {
            title: "装备数量",
            value: `${detail.equipments.length} 件`,
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
          <CardTitle>小精灵列表</CardTitle>
          <CardDescription>按能力等级排序</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>小精灵</TableHead>
                <TableHead>自定义名称</TableHead>
                <TableHead>装备</TableHead>
                <TableHead>名称可见</TableHead>
                <TableHead className="text-right">能力等级</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.companions.map((companion, index) => (
                <TableRow key={`${companion.companion}-${index}`}>
                  <TableCell className="font-medium">
                    {companion.companion}
                  </TableCell>
                  <TableCell>
                      {companion.customName ? (
                        <McText text={companion.customName} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  <TableCell>{companion.customWeapon ?? "—"}</TableCell>
                  <TableCell>
                    {companion.nameVisible ? (
                      <Badge variant="outline">可见</Badge>
                    ) : (
                      <span className="text-muted-foreground">隐藏</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">Lv.{companion.abilityLevel}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>装备列表</CardTitle>
          <CardDescription>该玩家小精灵装备的分配情况</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.equipments.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PawPrintIcon />
                </EmptyMedia>
                <EmptyTitle>暂无装备</EmptyTitle>
                <EmptyDescription>该玩家没有小精灵装备。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>装备</TableHead>
                  <TableHead>使用的小精灵</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.equipments.map((equipment, index) => (
                  <TableRow key={`${equipment.equipment}-${index}`}>
                    <TableCell className="font-medium">
                      {equipment.equipment}
                    </TableCell>
                    <TableCell>{equipment.companion ?? "未分配"}</TableCell>
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
