/**
 * 进程内 30 秒 TTL 缓存：总览 / 排行 / 聚合等重查询的短路层，
 * 避免每次页面请求都把同一批 SQL 打到 MySQL。
 *
 * 各模块用 createCache(namespace) 建立命名空间实例，key 自动加前缀，
 * 避免跨模块冲突（此前各插件各自复制同一份实现，key 如 "overview"
 * 仅靠每文件私有 Map 才不撞车，共享化后必须显式隔离）。
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 30_000;

const store = new Map<string, CacheEntry<unknown>>();

/** 带命名空间的 cached 函数：TTL 内命中直接返回，否则执行 loader 并写入。 */
export type CachedFn = <T>(key: string, loader: () => Promise<T>) => Promise<T>;

/** 创建命名空间缓存实例；同一 namespace 的 key 共享一个前缀。 */
export function createCache(
  namespace: string,
  ttlMs = DEFAULT_TTL_MS,
): CachedFn {
  return async function cached<T>(
    key: string,
    loader: () => Promise<T>,
  ): Promise<T> {
    const fullKey = `${namespace}:${key}`;
    const hit = store.get(fullKey) as CacheEntry<T> | undefined;
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value;
    }
    const value = await loader();
    store.set(fullKey, { value, expiresAt: Date.now() + ttlMs });
    return value;
  };
}

/** 清空全部查询缓存（数据库连接重建 / 配置变更后调用）。 */
export function invalidateQueryCache(): void {
  store.clear();
}
