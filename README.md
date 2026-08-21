# HandyInsight

PlayerTime（Minecraft 插件）MySQL 数据的只读分析面板。完整需求与约束见根目录 `计划.md`。

## 功能

- 首次进入配置 MySQL 连接，测试通过后保存并进入分析
- 数据总览：当前在线、今日活跃、今日累计时长、平均会话时长、7/30 天趋势、今日排行
- 玩家列表：名称搜索、今日/本周/本月/总时长、在线状态、服务端分页
- 玩家详情：周期时长、最近 30 天趋势、会话分页记录
- 外观设置：跟随系统 / 浅色 / 深色（侧边栏「设置」弹窗内）

## 技术栈

- Next.js 16 App Router + TypeScript 严格模式，pnpm 包管理，Node.js 自托管
- UI 仅使用 shadcn/ui（nova preset，Base UI + lucide 图标）
- MySQL 使用 `mysql2/promise` 连接池（最大 5 连接），全部参数化查询
- 校验用 Zod，日期用 date-fns，时区统一 Asia/Shanghai

## 快速开始

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 生产构建与运行
pnpm build
pnpm start
```

打开 <http://localhost:3000>，首次会自动进入 `/setup` 配置页：

1. 填写 MySQL 主机、端口、数据库名、用户名和密码
2. 点击「测试连接」，确认数据库中存在 `player_time` 与 `player_time_record` 表
3. 点击「保存并进入分析」

推荐使用只授予目标库 `SELECT` 权限的独立只读账号。

## 配置存储

连接配置保存在服务端 `.data/mysql.json`（含明文密码），该目录已加入 `.gitignore`，绝不返回浏览器。项目仅供个人自用，请勿暴露到公网。

## 常用命令

```bash
pnpm exec tsc --noEmit   # 类型检查
pnpm lint                # 代码检查
```

## 目录结构

```text
app/
  setup/                 # MySQL 配置页与设置弹窗
  (analysis)/            # 带 Sidebar 的分析页面组
    dashboard/           # 数据总览
    players/             # 玩家列表与详情
  api/
    mysql/               # status / test / config 配置链路
    playertime/          # 只读分析接口
components/ui/           # 仅 shadcn CLI 生成的组件
lib/
  server/                # 配置读写、连接池、接口错误处理
  playertime/            # 全部统计 SQL
  schemas/               # Zod 校验
types/                   # 共享类型
```
