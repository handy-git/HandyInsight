# =============================
# HandyInsight - Next.js 16 多阶段构建
# 采用 output: "standalone" 官方推荐方案，runner 阶段只保留运行时必需产物
# =============================

# ---------------------------------------------------------------
# Stage 1: deps —— 仅安装依赖
# 只复制 manifest，依赖不变时命中 Docker 层缓存
# ---------------------------------------------------------------
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate
WORKDIR /app

# CI=true 让 pnpm 11 进入非交互模式，避免审批构建脚本时无 TTY 卡住
ENV CI=true

# pnpm-workspace.yaml 含 allowBuilds 配置，pnpm 11 必需，缺失会导致 strictDepBuilds 报错
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# --store-dir 指向 BuildKit 缓存挂载，跨构建复用 pnpm store
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store

# ---------------------------------------------------------------
# Stage 2: builder —— 编译产物
# ---------------------------------------------------------------
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate
WORKDIR /app

# 时区与 next.config.ts 保持一致；关闭遥测
ENV TZ=Asia/Shanghai \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 缓存 .next/cache 加速二次构建
RUN --mount=type=cache,id=next-cache,target=/app/.next/cache \
    pnpm build

# ---------------------------------------------------------------
# Stage 3: runner —— 精简运行时（仅 standalone 产物）
# ---------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    TZ=Asia/Shanghai \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# tini 作为 PID 1 处理 SIGTERM/SIGINT 优雅关闭与僵尸进程回收
RUN apk add --no-cache tini \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# 复制 standalone 产物：server.js + 精简 node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# static 与 public 默认不打入 standalone，需手动补齐
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 运行期数据目录（MySQL 配置 mysql.json），确保非 root 可写
RUN mkdir -p /app/.data && chown -R nextjs:nodejs /app/.data

USER nextjs
EXPOSE 3000

# /login 在未登录时返回 200，作为存活探针
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:3000/login || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
