# HandyInsight

Minecraft 插件 MySQL 数据的只读分析面板，采用可插拔模块架构。

## 已支持插件

| 插件 | 数据表 | 功能 |
| --- | --- | --- |
| PlayerTime | `player_time`、`player_time_record` | 在线时长总览、趋势、排行、玩家列表与详情 |
| PlayerSignIn | `player_sign_in`、`player_sign_card` | 签到总览、签到趋势、今日名单、累计排行、签到玩家与详情（签到日历、补签卡、记录） |
| AuthMe | `authme` | 账户总览（注册/登录/活跃统计、注册趋势、最近登录与注册）、账户列表（IP、最后位置）、账户详情 |
| CompanionsPlus | `companions_active`、`companions_coin`、`companions_equipment`、`companions_owned` | 宠物总览（拥有玩家/出战数/宠物总量/货币总量、热门宠物榜、装备使用榜）、宠物玩家列表（宠物数/等级/货币）、玩家宠物详情（宠物清单、装备分配） |
| PlayerTitle | `title_list`、`title_player`、`title_coin` | 称号总览（称号数/持有与佩戴玩家/称号币总量、热门称号榜、称号币榜）、称号库（价格/时长/粒子/属性/上下架）、称号玩家列表与详情（佩戴、到期管理） |

连接数据库时会按 `lib/common/plugins.ts` 中的插件注册表探测数据表，表齐全才启用对应模块；缺失的模块不会出现在导航中，接口直接返回 404。新增插件只需在注册表登记并实现 `lib/plugins/<插件id>/` 包。

## 功能

- 首次进入配置 MySQL 连接，测试通过后保存并进入分析
- **总览 · 全服玩家**：跨插件统一玩家列表（注册时间、数据来源、总时长、签到、最近活跃，支持排序）与聚合详情（头像、汇总卡、活动时间线、分插件区块）；接入 AuthMe 后可见注册但从未上线的玩家
- PlayerTime：当前在线、今日活跃、累计时长、平均会话、7/30 天趋势、排行、独立玩家列表与详情
- PlayerSignIn：今日签到、累计签到、签到日历、连续签到、补签卡库存、独立签到玩家与详情
- AuthMe：注册与登录统计、近期活跃、注册趋势、最近登录/注册名单、独立账户列表与详情
- CompanionsPlus：宠物总览、热门宠物与装备排行、宠物玩家列表与详情
- PlayerTitle：称号总览、称号库、热门称号与称号币排行、玩家称号与到期管理
- 玩家头像：由 mc-heads.net 提供（按玩家名拉取皮肤，查不到自动回退默认头像；离线服 UUID 无法解析故不使用）
- Minecraft 富文本：称号等游戏内文本正确解析颜色——MiniMessage（`<red>`、`<gradient>`、`<rainbow>` 等，基于 minimessage-js）与 legacy 代码（`&a`/`§a`）双格式支持
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

## MySQL 配置

可通过以下服务端环境变量配置 MySQL：

```dotenv
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=minecraft
MYSQL_USER=handyinsight
MYSQL_PASSWORD=your_password
```

`MYSQL_PORT` 可省略，默认使用 `3306`；密码为空时可省略密码变量。数据库名不可省略，因为插件探测和数据查询都在指定数据库中执行。

环境变量配置优先于页面保存的配置。只要存在上述任一 `MYSQL_*` 变量，应用就仅使用环境变量；若必填项不完整，则视为尚未配置，不会回退到旧配置文件。

未使用环境变量时，连接配置保存在服务端 `.data/mysql.json`（含明文密码），该目录已加入 `.gitignore`，绝不返回浏览器。项目仅供个人自用，请勿暴露到公网。

## 登录配置

分析面板默认要求登录，账号和密码通过服务端环境变量配置：

```dotenv
AUTH_USERNAME=admin
AUTH_PASSWORD=change_this_password
```

两项均为必填，修改后需要重启服务。登录成功后会创建 7 天有效的 HttpOnly 签名 Cookie；修改任一登录环境变量会立即使旧会话失效。生产环境请通过 HTTPS 访问，并使用足够强的密码。

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
    authme/              # AuthMe 账户总览、列表与详情
    companions/          # CompanionsPlus 宠物总览、玩家与详情
    title/               # PlayerTitle 称号总览、称号库、玩家与详情
  api/
    mysql/               # status / test / config 配置链路
    playertime/          # PlayerTime 只读分析接口
    playersignin/        # PlayerSignIn 只读分析接口
    authme/              # AuthMe 只读分析接口
    companions/          # CompanionsPlus 只读分析接口
    playertitle/         # PlayerTitle 只读分析接口
components/ui/           # 仅 shadcn CLI 生成的组件
lib/
  common/                # 公共：插件注册表、格式化、类型、Zod 基础校验、主题、头像、玩家中心共享类型
  plugins/
    playertime/          # PlayerTime 模块：统计 SQL、类型、查询校验
    playersignin/        # PlayerSignIn 模块：统计 SQL、类型、查询校验
    authme/              # AuthMe 模块：统计 SQL、类型、查询校验
    companions/          # CompanionsPlus 模块：统计 SQL、类型、查询校验
    playertitle/         # PlayerTitle 模块：统计 SQL、类型、查询校验
  server/                # 服务端：配置读写、连接池、插件探测、玩家目录聚合、玩家中心查询、接口错误处理
```
