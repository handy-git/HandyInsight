/**
 * 插件界面偏好（显示开关 + 侧边栏顺序），存浏览器 localStorage。
 * 仅影响界面呈现；插件本身是否可用由服务端按数据表探测决定。
 */

export interface PluginPrefs {
  /** 侧边栏排序（插件 id 列表；未列入的排在最后，保持注册表顺序） */
  order: string[];
  /** 在侧边栏隐藏的插件 id */
  hidden: string[];
}

const STORAGE_KEY = "handyinsight-plugin-prefs";

const DEFAULT_PREFS: PluginPrefs = { order: [], hidden: [] };

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedPrefs: PluginPrefs = DEFAULT_PREFS;

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribePluginPrefs(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function getPluginPrefsSnapshot(): PluginPrefs {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) {
    return cachedPrefs;
  }
  cachedRaw = raw;
  if (!raw) {
    cachedPrefs = DEFAULT_PREFS;
    return cachedPrefs;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<PluginPrefs>;
    cachedPrefs = {
      order: Array.isArray(parsed.order) ? parsed.order.filter((id) => typeof id === "string") : [],
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden.filter((id) => typeof id === "string") : [],
    };
  } catch {
    cachedPrefs = DEFAULT_PREFS;
  }
  return cachedPrefs;
}

export function getServerPluginPrefsSnapshot(): PluginPrefs {
  return DEFAULT_PREFS;
}

/** 保存偏好并立即通知订阅方。 */
export function setPluginPrefs(prefs: PluginPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  notify();
}

/** 应用偏好：过滤隐藏插件并按 order 排序（未登记的保持相对顺序靠后）。 */
export function applyPluginPrefs<T extends { id: string }>(
  plugins: T[],
  prefs: PluginPrefs,
): T[] {
  const hiddenSet = new Set(prefs.hidden);
  const orderIndex = new Map(prefs.order.map((id, index) => [id, index]));
  return plugins
    .filter((plugin) => !hiddenSet.has(plugin.id))
    .map((plugin, index) => ({ plugin, index }))
    .sort(
      (a, b) =>
        (orderIndex.get(a.plugin.id) ?? Number.MAX_SAFE_INTEGER + a.index) -
        (orderIndex.get(b.plugin.id) ?? Number.MAX_SAFE_INTEGER + b.index),
    )
    .map((entry) => entry.plugin);
}
