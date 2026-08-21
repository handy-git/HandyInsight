# HandyInsight

Minecraft 插件 MySQL 数据的只读分析面板，采用可插拔模块架构。

## 已支持插件

| 插件 | 数据表 | 功能 |
| --- | --- | --- |
| PlayerTime | `player_time`、`player_time_record` | 在线时长总览、趋势、排行、玩家列表与详情 |
| PlayerSignIn | `player_sign_in`、`player_sign_card` | 签到总览、签到趋势、今日名单、累计排行、签到玩家与详情（签到日历、补签卡、记录） |

连接数据库时会按 `lib/common/plugins.ts` 中的插件注册表探测数据表，表齐全才启用对应模块；缺失的模块不会出现在导航中，接口直接返回 404。新增插件只需在注册表登记并实现 `lib/plugins/<插件id>/` 包。

## 功能

- 首次进入配置 MySQL 连接，测试通过后保存并进入分析
- PlayerTime：当前在线、今日活跃、累计时长、平均会话、7/30 天趋势、排行
- PlayerSignIn：今日签到、累计签到、签到日历、连续签到、补签卡库存
- 玩家列表：名称搜索、服务端分页、点击进入详情
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
2. 点击「测试连接」，系统会探测已支持插件的数据表并列出检测到的插件
3. 点击「保存并进入分析」

至少需要有一个插件的数据表齐全（如 PlayerTime 的 `player_time`、`player_time_record`）才能保存。推荐使用只授予目标库 `SELECT` 权限的独立只读账号。

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
    dashboard/           # PlayerTime 数据总览
    players/             # PlayerTime 玩家列表与详情
    signin/              # PlayerSignIn 签到总览、玩家与详情
  api/
    mysql/               # status / test / config 配置链路
    playertime/          # PlayerTime 只读分析接口
    playersignin/        # PlayerSignIn 只读分析接口
components/ui/           # 仅 shadcn CLI 生成的组件
lib/
  common/                # 公共：插件注册表、格式化、类型、Zod 基础校验、主题
  plugins/
    playertime/          # PlayerTime 模块：统计 SQL、类型、查询校验
    playersignin/        # PlayerSignIn 模块：统计 SQL、类型、查询校验
  server/                # 服务端：配置读写、连接池、插件探测、接口错误处理
```
