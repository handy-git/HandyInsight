<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# HandyInsight 项目说明

Minecraft 插件 MySQL 数据的只读分析面板，可插拔模块架构。

## 技术栈

- Next.js 16 App Router + TypeScript 严格模式，pnpm，Node.js 自托管
- UI 仅使用 shadcn/ui（base-nova preset，Base UI + lucide 图标），`components/ui` 只放 CLI 生成文件，不写业务 UI 组件
- MySQL 使用 `mysql2/promise` 连接池（最大 5 连接），校验用 Zod，日期用 date-fns
- 时区统一 Asia/Shanghai（`next.config.ts` 强制 `TZ`，连接池 `timezone: "+08:00"` + `dateStrings`）

## 插件化架构

- `lib/common/plugins.ts` 插件注册表：登记插件 id、名称、所需数据表、落地页；新增插件在此登记
- 连接 MySQL 时按数据表探测启用插件（`lib/server/plugins.ts` + `lib/server/mysql.ts` 的 `getEnabledPlugins`），API 用 `requirePlugin(id)` 守卫，未启用返回 404
- 每个插件一个包 `lib/plugins/<id>/`（queries / types / schemas），公共代码在 `lib/common/`，服务端基础设施在 `lib/server/`
- 侧边栏按已启用插件动态渲染导航（`app/(analysis)/layout.tsx` 的 `PLUGIN_NAV` 需与新插件同步）

## 关键结构

- `app/setup` MySQL 配置页 + 设置弹窗（数据库/常规两个 tab）；`app/(analysis)` 分析页面组（dashboard / players / signin）
- `app/api/mysql/*` 配置链路；`app/api/<插件id>/*` 各插件只读分析接口
- `lib/server/config.ts` 读写 `.data/mysql.json`（含明文密码，已 gitignore，绝不返回浏览器）
- 总览/排行 30 秒进程内缓存；趋势按范围有界查询

## 常用命令

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm exec tsc --noEmit`、`pnpm lint`
- 添加 UI：`npx shadcn@latest add <组件>`
