export type ThemeMode = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "handyinsight-theme";

const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

/** 首屏内联脚本：在 React 水合前应用已保存的主题，避免闪烁。 */
export const THEME_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var d=m==="dark"||(m!=="light"&&window.matchMedia("(${THEME_MEDIA_QUERY})").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})();`;

function resolveDark(mode: ThemeMode): boolean {
  return (
    mode === "dark" ||
    (mode === "system" && window.matchMedia(THEME_MEDIA_QUERY).matches)
  );
}

/** 应用主题到 <html> 根元素。 */
export function applyTheme(mode: ThemeMode): void {
  document.documentElement.classList.toggle("dark", resolveDark(mode));
}

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** 供 useSyncExternalStore 订阅：主题变化与系统深浅色切换都会触发。 */
export function subscribeTheme(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  const media = window.matchMedia(THEME_MEDIA_QUERY);
  media.addEventListener("change", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    media.removeEventListener("change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function getThemeSnapshot(): ThemeMode {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function getServerThemeSnapshot(): ThemeMode {
  return "system";
}

/** 保存并立即应用主题选择。 */
export function setThemeMode(mode: ThemeMode): void {
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  applyTheme(mode);
  notify();
}
