"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
}

const INITIAL_FORM: FormState = {
  host: "127.0.0.1",
  port: "3306",
  database: "",
  user: "",
  password: "",
  ssl: false,
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
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverride, setDragOverride] = useState<
    { id: string; name: string; description: string }[] | null
  >(null);

  // 设置弹窗打开时加载已启用插件列表
  useEffect(() => {
    if (!open || mode !== "settings") return;
    let cancelled = false;
    fetch("/api/mysql/status")
      .then((response) => response.json())
      .then((status: {
        configured: boolean;
        plugins?: { id: string; name: string; description: string }[];
      }) => {
        if (cancelled) return;
        setEnabledPlugins(status.plugins ?? []);
      })
      .catch(() => {
        if (!cancelled) setEnabledPlugins([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode]);

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
  const pluginOrder = dragOverride ?? sortedPlugins;

  function persistOrder(list: { id: string }[], hidden: string[]) {
    const next: PluginPrefs = { order: list.map((plugin) => plugin.id), hidden };
    setPluginPrefs(next);
  }

  function handlePluginDragOver(index: number) {
    if (dragIndex === null || dragIndex === index) return;
    const next = [...pluginOrder];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setDragOverride(next);
    setDragIndex(index);
  }

  function handlePluginDragEnd() {
    persistOrder(pluginOrder, prefs.hidden);
    setDragIndex(null);
    setDragOverride(null);
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
        body: JSON.stringify({ ...form, port: Number(form.port) }),
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
            />
          </InputGroup>
        </Field>
      </div>
      <Field orientation="horizontal">
        <Switch
          id="ssl"
          checked={form.ssl}
          onCheckedChange={(checked) => update("ssl", checked)}
        />
        <FieldLabel htmlFor="ssl">启用 SSL/TLS 连接</FieldLabel>
      </Field>
    </FieldGroup>
  );

  const testAlerts = (
    <>
      {test.status === "success" && (
        <Alert>
          <CheckCircle2Icon />
          <AlertTitle>连接成功</AlertTitle>
          <AlertDescription>
            {test.plugins.length > 0
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
        测试连接
      </Button>
      <Button onClick={handleSave} disabled={test.status !== "success" || saving}>
        {saving && <Spinner data-icon="inline-start" />}
        保存并进入分析
      </Button>
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
              先测试连接，通过后才能保存配置
            </p>
            {actionButtons}
          </DialogFooter>
        </DialogContent>
      ) : (
        <DialogContent
          showCloseButton={showCloseButton}
          className="gap-0 overflow-hidden border p-0 shadow-xl sm:max-w-2xl"
        >
          <DialogTitle className="sr-only">设置</DialogTitle>
          <Tabs orientation="vertical" defaultValue="database" className="contents">
            <div className="grid min-h-[420px] grid-cols-1 sm:grid-cols-[168px_1fr]">
              <nav className="border-b bg-muted/40 p-3 sm:border-r sm:border-b-0">
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
                      先测试连接，通过后才能保存配置
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
                      value={[theme]}
                      onValueChange={(values) => {
                        const next = values[0] as ThemeMode | undefined;
                        if (next) setThemeMode(next);
                      }}
                    >
                      <ToggleGroupItem value="system">
                        <MonitorIcon data-icon="inline-start" />
                        跟随系统
                      </ToggleGroupItem>
                      <ToggleGroupItem value="light">
                        <SunIcon data-icon="inline-start" />
                        浅色
                      </ToggleGroupItem>
                      <ToggleGroupItem value="dark">
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
                        <div
                          key={index}
                          className="h-14 rounded-md border bg-muted/40"
                        />
                      ))}
                    </div>
                  ) : pluginOrder.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      当前没有已启用的插件。
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {pluginOrder.map((plugin, index) => {
                        const shown = !prefs.hidden.includes(plugin.id);
                        return (
                          <div
                            key={plugin.id}
                            draggable
                            onDragStart={() => setDragIndex(index)}
                            onDragOver={(event) => {
                              event.preventDefault();
                              handlePluginDragOver(index);
                            }}
                            onDragEnd={handlePluginDragEnd}
                            className="flex items-center gap-3 rounded-md border px-3 py-2 transition-colors"
                          >
                            <GripVerticalIcon className="cursor-grab text-muted-foreground" />
                            <div className="flex flex-1 flex-col">
                              <span className="text-sm font-medium">
                                {plugin.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {plugin.description}
                              </span>
                            </div>
                            <Switch
                              checked={shown}
                              onCheckedChange={(checked) =>
                                togglePluginShown(plugin.id, checked)
                              }
                              aria-label={`显示 ${plugin.name}`}
                            />
                          </div>
                        );
                      })}
                    </div>
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
