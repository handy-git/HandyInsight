"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircleIcon,
  ClipboardListIcon,
  CoinsIcon,
  ScrollTextIcon,
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
import { playerAvatarUrl } from "@/lib/common/avatar";
import {
  fetchJson,
  formatDateTime,
  formatNumber,
} from "@/lib/common/format";
import { McText } from "@/lib/common/mc-text";
import type { TaskPlayerDetail, TaskRecord } from "@/lib/plugins/playertask/types";
import { cn } from "@/lib/utils";

function formatCoins(coins: number): string {
  return formatNumber(coins);
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full rounded-full",
          value >= 100 ? "bg-primary" : "bg-primary/60",
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/** 单个任务记录：名称/状态/时间 + 进度明细条。 */
function TaskRecordRow({
  record,
  extra,
}: {
  record: TaskRecord;
  extra: string | null | undefined;
}) {
  const completed = record.completed;
  return (
    <div
      className={cn(
        "flex flex-col gap-2 py-3",
        "border-b last:border-b-0",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">
            <McText text={record.taskName} />
          </span>
          {extra && <Badge variant="outline">{extra}</Badge>}
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <Badge variant={completed ? "default" : "outline"}>
            {completed ? "已完成" : "进行中"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {record.taskDate ? formatDateTime(record.taskDate) : "—"}
          </span>
        </span>
      </div>
      {(record.taskDemand || record.taskRewards) && (
        <p className="text-xs text-muted-foreground">
          {record.taskDemand && (
            <span>
              要求：<McText text={record.taskDemand} />
              {record.taskRewards ? " · " : ""}
            </span>
          )}
          {record.taskRewards && (
            <span>
              奖励：<McText text={record.taskRewards} />
            </span>
          )}
        </p>
      )}
      {record.demands.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {record.demands.map((demand, index) => {
            const rate =
              demand.amount === 0
                ? 0
                : (demand.completionAmount / demand.amount) * 100;
            return (
              <div key={index} className="flex items-center gap-2 text-xs">
                <span className="w-20 shrink-0 truncate text-muted-foreground">
                  {demand.type ?? "进度"}
                </span>
                <Progress value={rate} />
                <span className="shrink-0 tabular-nums">
                  {demand.completionAmount}/{demand.amount}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TaskRecordCard({
  title,
  description,
  records,
  extraOf,
  icon,
}: {
  title: string;
  description: string;
  records: TaskRecord[];
  extraOf: (record: TaskRecord) => string | null | undefined;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">{icon}</EmptyMedia>
              <EmptyTitle>暂无记录</EmptyTitle>
              <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col divide-y">
            {records.map((record) => (
              <TaskRecordRow
                key={`${record.id}-${record.taskId}`}
                record={record}
                extra={extraOf(record)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TaskPlayerDetailPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const [detail, setDetail] = useState<TaskPlayerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<TaskPlayerDetail>(
      `/api/task/players/${encodeURIComponent(uuid)}`,
    )
      .then(setDetail)
      .catch((err: Error) => setError(err.message));
  }, [uuid]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>加载任务详情失败</AlertTitle>
        <AlertDescription>
          {error}
          <Link href="/task/players" className="ml-2 underline">
            返回任务玩家
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
            <BreadcrumbLink render={<Link href="/task/players" />}>
              任务玩家
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
                {detail.coins !== null && (
                  <Badge>
                    <CoinsIcon data-icon="inline-start" />
                    {formatCoins(detail.coins)} 任务币
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
          {
            title: "任务币",
            value:
              detail.coins === null
                ? "—"
                : formatCoins(detail.coins),
          },
          {
            title: "每日完成",
            value: `${detail.daily.filter((task) => task.completed).length} 个`,
          },
          {
            title: "NPC 完成",
            value: `${detail.npc.filter((task) => task.completed).length} 个`,
          },
          {
            title: "卷轴完成",
            value: `${detail.reel.filter((task) => task.completed).length} 个`,
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
        <TaskRecordCard
          title="每日任务"
          description="该玩家的每日任务记录，含刷新次数"
          records={detail.daily}
          icon={<ClipboardListIcon className="size-4 text-muted-foreground" />}
          extraOf={(record) =>
            record.refresh !== null && record.refresh !== undefined
              ? `刷新 ${record.refresh} 次`
              : null
          }
        />
        <TaskRecordCard
          title="NPC 任务"
          description="该玩家的 NPC 任务记录，含领取次数"
          records={detail.npc}
          icon={<ScrollTextIcon className="size-4 text-muted-foreground" />}
          extraOf={(record) =>
            record.claimCount !== null && record.claimCount !== undefined
              ? `领取 ${record.claimCount} 次`
              : null
          }
        />
      </div>

      <TaskRecordCard
        title="卷轴任务"
        description="该玩家的卷轴任务记录，含稀有度"
        records={detail.reel}
        icon={<ScrollTextIcon className="size-4 text-muted-foreground" />}
        extraOf={(record) => record.rarity}
      />
    </>
  );
}
