"use client";

import { useEffect, useState } from "react";
import { AlertCircleIcon, ClipboardListIcon, CoinsIcon, GiftIcon } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchJson } from "@/lib/common/format";
import { McText } from "@/lib/common/mc-text";
import type {
  NpcTaskEntry,
  TaskLibrary,
  TaskLibraryEntry,
  TaskPoolEntry,
} from "@/lib/plugins/playertask/types";

/** 物品序列化文本截断展示。 */
function ItemStackText({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const max = 120;
  return (
    <span
      className="block max-w-64 truncate font-mono text-xs"
      title={value}
    >
      {value.length > max ? `${value.slice(0, max)}…` : value}
    </span>
  );
}

function LibraryTable({
  tasks,
}: {
  tasks: TaskLibraryEntry[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">ID</TableHead>
          <TableHead>任务名称</TableHead>
          <TableHead>类型</TableHead>
          <TableHead>稀有度</TableHead>
          <TableHead>任务要求</TableHead>
          <TableHead>任务奖励</TableHead>
          <TableHead>描述</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell>{task.id}</TableCell>
            <TableCell className="font-medium">
              <McText text={task.taskName} />
            </TableCell>
            <TableCell>
              {task.type ? <Badge variant="outline">{task.type}</Badge> : "—"}
            </TableCell>
            <TableCell>
              {task.rarity ? <Badge variant="outline">{task.rarity}</Badge> : "—"}
            </TableCell>
            <TableCell className="max-w-56">
              <span className="block truncate" title={task.taskDemand ?? ""}>
                <McText text={task.taskDemand ?? "—"} />
              </span>
            </TableCell>
            <TableCell className="max-w-56">
              <span className="block truncate" title={task.taskRewards ?? ""}>
                <McText text={task.taskRewards ?? "—"} />
              </span>
            </TableCell>
            <TableCell className="max-w-48 text-muted-foreground">
              <span className="block truncate" title={task.description ?? ""}>
                <McText text={task.description ?? "—"} />
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function NpcTable({ tasks }: { tasks: NpcTaskEntry[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">ID</TableHead>
          <TableHead>任务名称</TableHead>
          <TableHead>前置任务</TableHead>
          <TableHead>NPC</TableHead>
          <TableHead>永久任务</TableHead>
          <TableHead className="text-right">可完成次数</TableHead>
          <TableHead className="text-right">任务 CD</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell>{task.id}</TableCell>
            <TableCell className="font-medium">
              <McText text={task.taskName ?? "—"} />
            </TableCell>
            <TableCell>
              {task.parentId === null ? (
                <span className="text-muted-foreground">无</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Badge variant="outline">#{task.parentId}</Badge>
                  <McText text={task.parentName ?? ""} />
                </span>
              )}
            </TableCell>
            <TableCell>
              {task.npcId ? (
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {task.npcId}
                </code>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell>
              {task.isEver ? (
                <Badge>永久</Badge>
              ) : (
                <span className="text-muted-foreground">限次</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              {task.number ?? "—"}
            </TableCell>
            <TableCell className="text-right">
              {task.cdSeconds === null ? (
                "—"
              ) : task.cdSeconds === 0 ? (
                "无 CD"
              ) : (
                `${task.cdSeconds}s`
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PoolTable({
  title,
  rows,
  icon,
}: {
  title: string;
  rows: TaskPoolEntry[];
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle>
        <CardDescription>配置池中的目标 / 奖励条目</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">{icon}</EmptyMedia>
              <EmptyTitle>暂无数据</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>类型</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead>描述</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.id}</TableCell>
                  <TableCell>
                    {row.type ? <Badge variant="outline">{row.type}</Badge> : "—"}
                  </TableCell>
                  <TableCell className="text-right">{row.amount ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.description ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function TaskLibraryPage() {
  const [library, setLibrary] = useState<TaskLibrary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<TaskLibrary>("/api/task/library")
      .then(setLibrary)
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
    <Card>
      <CardHeader>
        <CardTitle>任务库</CardTitle>
        <CardDescription>
          任务配置、NPC 任务、商城与配置池（静态数据，30 秒缓存）
        </CardDescription>
      </CardHeader>
      <CardContent>
        {library === null ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <Tabs defaultValue="tasks">
            <TabsList>
              <TabsTrigger value="tasks">任务列表</TabsTrigger>
              <TabsTrigger value="npc">NPC 任务</TabsTrigger>
              <TabsTrigger value="shop">任务商城</TabsTrigger>
              <TabsTrigger value="pools">配置池</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks" className="pt-4">
              {library.tasks.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClipboardListIcon />
                    </EmptyMedia>
                    <EmptyTitle>暂无任务配置</EmptyTitle>
                    <EmptyDescription>task_list 表为空。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <LibraryTable tasks={library.tasks} />
              )}
            </TabsContent>
            <TabsContent value="npc" className="pt-4">
              {library.npcTasks.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClipboardListIcon />
                    </EmptyMedia>
                    <EmptyTitle>暂无 NPC 任务</EmptyTitle>
                    <EmptyDescription>task_npc 表为空。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <NpcTable tasks={library.npcTasks} />
              )}
            </TabsContent>
            <TabsContent value="shop" className="pt-4">
              {library.shopItems.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CoinsIcon />
                    </EmptyMedia>
                    <EmptyTitle>暂无商城条目</EmptyTitle>
                    <EmptyDescription>task_shop 表为空。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead className="text-right">数量</TableHead>
                      <TableHead>物品</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {library.shopItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.id}</TableCell>
                        <TableCell>
                          {item.type ? (
                            <Badge variant="outline">{item.type}</Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.amount ?? "—"}
                        </TableCell>
                        <TableCell>
                          <ItemStackText value={item.itemStack} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            <TabsContent value="pools" className="flex flex-col gap-4 pt-4">
              <PoolTable
                title="任务目标池"
                rows={library.demandPool}
                icon={<ClipboardListIcon className="size-4 text-muted-foreground" />}
              />
              <PoolTable
                title="任务奖励池"
                rows={library.rewardPool}
                icon={<GiftIcon className="size-4 text-muted-foreground" />}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
