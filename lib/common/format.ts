/** 秒数格式化为中文可读时长。 */
export function formatSeconds(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} 天 ${hours} 小时`;
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`;
  if (minutes > 0) return `${minutes} 分钟`;
  return `${seconds % 60} 秒`;
}

/**
 * 归一化数据库日期字符串为 yyyy-MM-dd HH:mm:ss。
 * 去掉毫秒精度（DATETIME(3)）与 T 分隔；空值返回空字符串。
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace("T", " ").slice(0, 19);
}

/** 秒数转小时（保留 1 位小数），用于图表展示。 */
export function secondsToHours(seconds: number): number {
  return Math.round((seconds / 3600) * 10) / 10;
}

/** 数字千分位格式化（zh-CN），用于余额 / 流量 / 热力等数值展示。 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

/**
 * 数据库数值读取守卫：null / undefined / 空串与非法数值统一回退（默认 0），
 * 避免 NULL 聚合列直接 Number() 产生 NaN。
 */
export function num(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export interface ApiFailure {
  ok: false;
  message: string;
}

/** 统一请求：失败时抛出携带接口 message 的 Error。 */
export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = (await response.json()) as T | ApiFailure;
  if (!response.ok || (data as ApiFailure).ok === false) {
    throw new Error((data as ApiFailure).message ?? "请求失败，请稍后重试");
  }
  return data as T;
}
