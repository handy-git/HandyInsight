"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BlocksIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  GlobeIcon,
  GripVerticalIcon,
  KeyRoundIcon,
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  UserRoundIcon,
  XCircleIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  getServerThemeSnapshot,
  getThemeSnapshot,
  setThemeMode,
  subscribeTheme,
  type ThemeMode,
} from "@/lib/common/theme";
import {
  getPluginPrefsSnapshot,
  getServerPluginPrefsSnapshot,
  setPluginPrefs,
  subscribePluginPrefs,
  type PluginPrefs,
} from "@/lib/common/plugin-prefs";

interface FormState {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  sslVerify: boolean;
}

const INITIAL_FORM: FormState = {
  host: "127.0.0.1",
  port: "3306",
  database: "",
  user: "",
  password: "",
  ssl: false,
  sslVerify: true,
};

type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "success"; plugins: string[] }
  | { status: "error"; message: string };

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  showCloseButton?: boolean;
  /** setup：首次配置的单栏表单；settings：带左侧导航的完整设置 */
  mode?: "setup" | "settings";
}

export function SettingsDialog({
  open,
  onOpenChange,
  onSaved,
  showCloseButton = true,
  mode = "settings",
}: SettingsDialogProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [test, setTest] = useState<TestState>({ status: "idle" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [configEditable, setConfigEditable] = useState<boolean | null>(null);
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const prefs = useSyncExternalStore(
    subscribePluginPrefs,
    getPluginPrefsSnapshot,
    getServerPluginPrefsSnapshot,
  );
  const [enabledPlugins, setEnabledPlugins] = useState<
    { id: string; name: string; description: string }[] | null
  >(null);
  const dragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // 弹窗打开时同步配置来源；设置模式同时加载已启用插件列表
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/mysql/status")
      .then((response) => response.json())
      .then((status: {
        configured: boolean;
        editable?: boolean;
        plugins?: { id: string; name: string; description: string }[];
      }) => {
        if (cancelled) return;
        setConfigEditable(status.editable ?? true);
        if (mode === "settings") {
          setEnabledPlugins(status.plugins ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConfigEditable(true);
          if (mode === "settings") setEnabledPlugins([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode]);

  const configLocked = configEditable === false;

  // 展示顺序：注册表顺序 + 偏好排序（拖拽中覆盖）
  const sortedPlugins = useMemo(() => {
    if (!enabledPlugins) return [];
    const orderIndex = new Map(prefs.order.map((id, index) => [id, index]));
    return [...enabledPlugins]
      .map((plugin, index) => ({ plugin, index }))
      .sort(
        (a, b) =>
          (orderIndex.get(a.plugin.id) ?? Number.MAX_SAFE_INTEGER + a.index) -
          (orderIndex.get(b.plugin.id) ?? Number.MAX_SAFE_INTEGER + b.index),
      )
      .map((entry) => entry.plugin);
  }, [enabledPlugins, prefs.order]);
  const pluginOrder = sortedPlugins;

  function persistOrder(list: { id: string }[], hidden: string[]) {
    const next: PluginPrefs = { order: list.map((plugin) => plugin.id), hidden };
    setPluginPrefs(next);
  }

  /** 拖拽结束：落点换位并持久化（拖动过程中 dnd-kit 负责动画预览）。 */
  function handlePluginDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pluginOrder.findIndex(
      (plugin) => plugin.id === active.id,
    );
    const newIndex = pluginOrder.findIndex((plugin) => plugin.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    persistOrder(arrayMove(pluginOrder, oldIndex, newIndex), prefs.hidden);
  }

  function togglePluginShown(id: string, shown: boolean) {
    const hidden = shown
      ? prefs.hidden.filter((item) => item !== id)
      : [...new Set([...prefs.hidden, id])];
    persistOrder(pluginOrder, hidden);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setTest({ status: "idle" });
    setSaveError(null);
  }

  async function handleTest() {
    setTest({ status: "testing" });
    setSaveError(null);
    try {
      const response = await fetch("/api/mysql/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: configLocked
          ? undefined
          : JSON.stringify({ ...form, port: Number(form.port) }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        plugins?: { id: string; name: string }[];
      };
      if (data.ok) {
        setTest({
          status: "success",
          plugins: (data.plugins ?? []).map((plugin) => plugin.name),
        });
      } else {
        setTest({ status: "error", message: data.message ?? "连接失败" });
      }
    } catch {
      setTest({ status: "error", message: "请求失败，请稍后重试" });
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch("/api/mysql/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, port: Number(form.port) }),
      });
      const data = (await response.json()) as { ok: boolean; message?: string };
      if (data.ok) {
        onSaved?.();
      } else {
        setSaveError(data.message ?? "保存失败，请重试");
      }
    } catch {
      setSaveError("请求失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  const databaseFields = (
    <FieldGroup>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="host">主机地址</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <GlobeIcon />
            </InputGroupAddon>
            <InputGroupInput
              id="host"
              value={form.host}
              onChange={(event) => update("host", event.target.value)}
              placeholder="127.0.0.1"
              autoComplete="off"
              disabled={configLocked}
            />
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel htmlFor="port">端口</FieldLabel>
          <Input
            id="port"
            type="number"
            min={1}
            max={65535}
            value={form.port}
            onChange={(event) => update("port", event.target.value)}
            disabled={configLocked}
          />
        </Field>
        <Field className="sm:col-span-3">
          <FieldLabel htmlFor="database">数据库名</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <DatabaseIcon />
            </InputGroupAddon>
            <InputGroupInput
              id="database"
              value={form.database}
              onChange={(event) => update("database", event.target.value)}
              placeholder="playertime"
              autoComplete="off"
              disabled={configLocked}
            />
          </InputGroup>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="user">用户名</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <UserRoundIcon />
            </InputGroupAddon>
            <InputGroupInput
              id="user"
              value={form.user}
              onChange={(event) => update("user", event.target.value)}
              autoComplete="off"
              disabled={configLocked}
            />
          </InputGroup>
          <FieldDescription>
            推荐使用只授予 SELECT 权限的独立只读账号。
          </FieldDescription>
        </Field>
        <Field className="sm:col-span-3">
          <FieldLabel htmlFor="password">密码</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <KeyRoundIcon />
            </InputGroupAddon>
            <InputGroupInput
              id="password"
              type="password"
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              autoComplete="new-password"
              disabled={configLocked}
            />
          </InputGroup>
        </Field>
      </div>
      <Field orientation="horizontal">
        <Switch
          id="ssl"
          checked={form.ssl}
          onCheckedChange={(checked) => update("ssl", checked)}
          disabled={configLocked}
        />
        <FieldLabel htmlFor="ssl">启用 SSL/TLS 连接</FieldLabel>
      </Field>
      {form.ssl && (
        <Field orientation="horizontal">
          <Switch
            id="sslVerify"
            checked={form.sslVerify}
            onCheckedChange={(checked) => update("sslVerify", checked)}
            disabled={configLocked}
          />
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="sslVerify">验证服务器证书</FieldLabel>
            <FieldDescription>
              仅在目标使用自签名证书时关闭验证。
            </FieldDescription>
          </div>
        </Field>
      )}
    </FieldGroup>
  );

  const testAlerts = (
    <>
      {configLocked && (
        <Alert>
          <DatabaseIcon />
          <AlertTitle>环境变量托管</AlertTitle>
          <AlertDescription>
            数据库连接由服务端环境变量管理，此处只能测试当前配置。
          </AlertDescription>
        </Alert>
      )}
      {test.status === "success" && (
        <Alert>
          <CheckCircle2Icon />
          <AlertTitle>连接成功</AlertTitle>
          <AlertDescription>
            {configLocked
              ? `当前环境变量配置可用，已检测到插件：${test.plugins.join("、")}`
              : test.plugins.length > 0
              ? `已检测到插件：${test.plugins.join("、")}；保存后即可启用对应分析功能。`
              : "连接正常，可以保存配置。"}
          </AlertDescription>
        </Alert>
      )}
      {test.status === "error" && (
        <Alert variant="destructive">
          <XCircleIcon />
          <AlertTitle>连接失败</AlertTitle>
          <AlertDescription>{test.message}</AlertDescription>
        </Alert>
      )}
      {saveError && (
        <Alert variant="destructive">
          <XCircleIcon />
          <AlertTitle>保存失败</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}
    </>
  );

  const actionButtons = (
    <>
      <Button
        variant="outline"
        onClick={handleTest}
        disabled={test.status === "testing" || saving}
      >
        {test.status === "testing" && <Spinner data-icon="inline-start" />}
        {configLocked ? "测试当前连接" : "测试连接"}
      </Button>
      {!configLocked && (
        <Button
          onClick={handleSave}
          disabled={test.status !== "success" || saving}
        >
          {saving && <Spinner data-icon="inline-start" />}
          保存并进入分析
        </Button>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {mode === "setup" ? (
        <DialogContent
          showCloseButton={showCloseButton}
          className="gap-6 border shadow-xl sm:max-w-xl"
        >
          <DialogHeader className="flex-row items-center gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
              <DatabaseIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle>连接 PlayerTime 数据库</DialogTitle>
              <DialogDescription>
                填写 MySQL 连接信息，测试通过后即可保存并进入数据分析。
              </DialogDescription>
            </div>
          </DialogHeader>

          {databaseFields}
          {testAlerts}

          <DialogFooter>
            <p className="mr-auto hidden text-xs text-muted-foreground sm:block">
              {configLocked
                ? "连接信息需在服务端环境变量中修改"
                : "先测试连接，通过后才能保存配置"}
            </p>
            {actionButtons}
          </DialogFooter>
        </DialogContent>
      ) : (
        <DialogContent
          showCloseButton={showCloseButton}
          className="gap-0 overflow-hidden border p-0 shadow-xl sm:max-w-3xl"
        >
          <DialogTitle className="sr-only">设置</DialogTitle>
          <Tabs orientation="vertical" defaultValue="database" className="contents">
            <div className="grid min-h-[420px] grid-cols-1 sm:grid-cols-[168px_1fr]">
              <nav className="flex flex-col gap-1 border-b bg-muted/40 p-3 sm:border-r sm:border-b-0">
                <p className="hidden px-2 pb-1 text-xs font-medium text-muted-foreground sm:block">
                  设置
                </p>
                <TabsList variant="line" className="w-full">
                  <TabsTrigger value="database">
                    <DatabaseIcon data-icon="inline-start" />
                    数据库
                  </TabsTrigger>
                  <TabsTrigger value="general">
                    <SettingsIcon data-icon="inline-start" />
                    常规
                  </TabsTrigger>
                  <TabsTrigger value="plugins">
                    <BlocksIcon data-icon="inline-start" />
                    插件
                  </TabsTrigger>
                </TabsList>
              </nav>

              <div className="flex flex-col">
                <TabsContent
                  value="database"
                  className="flex flex-1 flex-col gap-4 p-4"
                >
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">数据库连接</p>
                    <p className="text-xs text-muted-foreground">
                      PlayerTime 的数据读取自该 MySQL 实例。
                    </p>
                  </div>
                  {databaseFields}
                  {testAlerts}
                  <DialogFooter>
                    <p className="mr-auto hidden text-xs text-muted-foreground sm:block">
                      {configLocked
                        ? "连接信息需在服务端环境变量中修改"
                        : "先测试连接，通过后才能保存配置"}
                    </p>
                    {actionButtons}
                  </DialogFooter>
                </TabsContent>

                <TabsContent
                  value="general"
                  className="flex flex-1 flex-col gap-4 p-4"
                >
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">常规</p>
                    <p className="text-xs text-muted-foreground">
                      界面偏好设置。
                    </p>
                  </div>
                  <Field>
                    <FieldLabel>外观</FieldLabel>
                    <FieldDescription>
                      选择界面主题；跟随系统时自动切换深浅色。
                    </FieldDescription>
                    <ToggleGroup
                      className="w-full"
                      value={[theme]}
                      onValueChange={(values) => {
                        const next = values[0] as ThemeMode | undefined;
                        if (next) setThemeMode(next);
                      }}
                    >
                      <ToggleGroupItem value="system" className="flex-1 justify-center">
                        <MonitorIcon data-icon="inline-start" />
                        跟随系统
                      </ToggleGroupItem>
                      <ToggleGroupItem value="light" className="flex-1 justify-center">
                        <SunIcon data-icon="inline-start" />
                        浅色
                      </ToggleGroupItem>
                      <ToggleGroupItem value="dark" className="flex-1 justify-center">
                        <MoonIcon data-icon="inline-start" />
                        深色
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </Field>
                </TabsContent>

                <TabsContent
                  value="plugins"
                  className="flex flex-1 flex-col gap-4 p-4"
                >
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">插件管理</p>
                    <p className="text-xs text-muted-foreground">
                      控制侧边栏中插件的显示与顺序，拖动左侧手柄调整排序。
                    </p>
                  </div>
                  {enabledPlugins === null ? (
                    <div className="flex flex-col gap-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-14 w-full" />
                      ))}
                    </div>
                  ) : pluginOrder.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      当前没有已启用的插件。
                    </p>
                  ) : (
                    <DndContext
                      sensors={dragSensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handlePluginDragEnd}
                    >
                      <SortableContext
                        items={pluginOrder.map((plugin) => plugin.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="flex select-none flex-col gap-2">
                          {pluginOrder.map((plugin) => (
                            <SortablePluginRow
                              key={plugin.id}
                              plugin={plugin}
                              shown={!prefs.hidden.includes(plugin.id)}
                              onToggle={(checked) =>
                                togglePluginShown(plugin.id, checked)
                              }
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                  <p className="text-xs text-muted-foreground">
                    开关只控制侧边栏显示，不影响数据采集与接口。
                  </p>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </DialogContent>
      )}
    </Dialog>
  );
}

interface SortablePlugin {
  id: string;
  name: string;
  description: string;
}

/** 可拖拽排序的插件行：仅抓手可发起拖动，其余行带位移动画。 */
function SortablePluginRow({
  plugin,
  shown,
  onToggle,
}: {
  plugin: SortablePlugin;
  shown: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plugin.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={
        "flex items-center gap-3 rounded-lg border bg-popover px-3 py-2 transition-colors " +
        (isDragging
          ? "opacity-70 shadow-lg ring-2 ring-primary/40"
          : "hover:bg-muted/40")
      }
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`拖动调整 ${plugin.name} 顺序`}
        className="flex size-7 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing"
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <div className="flex flex-1 flex-col">
        <span className="text-sm font-medium">{plugin.name}</span>
        <span className="text-xs text-muted-foreground">
          {plugin.description}
        </span>
      </div>
      <Switch
        checked={shown}
        onCheckedChange={onToggle}
        aria-label={`显示 ${plugin.name}`}
      />
    </div>
  );
}
