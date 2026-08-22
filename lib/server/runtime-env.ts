export type ServerEnv = Readonly<Record<string, string | undefined>>;

interface RuntimeEnvCache {
  /** EdgeOne 同一部署内固定不变的云函数环境变量。 */
  edgeOneEnv?: ServerEnv;
}

const globalCache = globalThis as unknown as {
  __handyinsightRuntimeEnv?: RuntimeEnvCache;
};
const cache: RuntimeEnvCache = globalCache.__handyinsightRuntimeEnv ?? {};
globalCache.__handyinsightRuntimeEnv = cache;

/** 注入 EdgeOne 云函数环境变量；同一函数实例只接受首次配置。 */
export function configureRuntimeEnv(env: ServerEnv): void {
  cache.edgeOneEnv ??= Object.freeze({ ...env });
}

/** 获取当前服务端环境变量，本地 Next.js 运行时回退到 process.env。 */
export function getRuntimeEnv(): ServerEnv {
  return cache.edgeOneEnv ?? process.env;
}

/** 当前请求是否运行在 EdgeOne Node Cloud Functions。 */
export function isEdgeOneRuntime(): boolean {
  return cache.edgeOneEnv !== undefined;
}
