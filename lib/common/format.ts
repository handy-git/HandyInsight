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

/** 秒数转小时（保留 1 位小数），用于图表展示。 */
export function secondsToHours(seconds: number): number {
  return Math.round((seconds / 3600) * 10) / 10;
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
