# <img src="public/logo.png" alt="HandyInsight" width="36" height="36" align="center"> HandyInsight

[![Deploy with EdgeOne Makers](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?repository-url=https%3A%2F%2Fgithub.com%2Fhandy-git%2FHandyInsight&install-command=pnpm%20install&build-command=pnpm%20build&env=AUTH_USERNAME%2CAUTH_PASSWORD%2CMYSQL_HOST%2CMYSQL_PORT%2CMYSQL_DATABASE%2CMYSQL_USER%2CMYSQL_PASSWORD&env-description=%E9%83%A8%E7%BD%B2%E5%BF%85%E9%9C%80%EF%BC%9AAUTH_USERNAME%2FAUTH_PASSWORD%20%E4%B8%BA%E7%99%BB%E5%BD%95%E8%B4%A6%E5%8F%B7%E4%B8%8E%E5%AF%86%E7%A0%81%EF%BC%88%E5%BF%85%E5%A1%AB%EF%BC%89%EF%BC%9BMYSQL_*%20%E4%B8%BA%20MySQL%20%E7%9B%B4%E8%BF%9E%E9%85%8D%E7%BD%AE%EF%BC%88%E5%8F%AF%E9%80%89%EF%BC%8C%E8%AE%BE%E7%BD%AE%E5%90%8E%E4%BC%98%E5%85%88%E4%BA%8E%E8%AE%BE%E7%BD%AE%E9%A1%B5%E9%85%8D%E7%BD%AE%EF%BC%89&env-link=https%3A%2F%2Fgithub.com%2Fhandy-git%2FHandyInsight%23%E6%9C%AC%E5%9C%B0%E6%B5%8B%E8%AF%95%E9%85%8D%E7%BD%AE)

一个面向 Minecraft 服务器管理者的插件数据分析面板。

连接服务器的 MySQL 数据库后，可以在浏览器中查看玩家活跃、在线时长、签到、宠物、称号等数据。HandyInsight 只读取数据，不会修改游戏数据库。

![全服玩家列表](docs/全服玩家列表.webp)

## 可以查看什么

- **全服玩家**：集中搜索玩家，查看注册时间、在线时长、签到次数、宠物和最近活跃时间。
- **在线时长**：查看当前在线、今日活跃、在线趋势和玩家排行。
- **每日签到**：查看签到趋势、今日名单、累计排行和补签卡数量。
- **登录账户**：查看注册、登录和近期活跃情况。
- **宠物数据**：查看宠物数量、出战情况、热门宠物和玩家排行。
- **称号数据**：查看热门称号、称号库、玩家佩戴情况和称号币排行。
- **任务系统**：查看任务币、每日/NPC/卷轴任务完成情况和任务库配置。
- **地标系统**：查看地标热力/流量排行、类型与服务器分布、地标库、上架置顶状态、传送和收藏数据。
- **货币系统**：查看各货币类型流通统计、余额排行、货币流水与变更原因。

系统会根据数据库中已有的数据表自动显示可用功能，没有安装的插件不会出现在菜单中。

## 界面预览

### 在线时长与签到

通过趋势图和排行快速了解服务器活跃情况。

| 在线时长                                | 每日签到                        |
|-----------------------------------------|---------------------------------|
| ![在线时长总览](docs/在线时长总览.webp) | ![签到总览](docs/签到总览.webp) |

### 宠物与称号

查看玩家宠物、热门称号以及游戏内富文本颜色效果。

| 宠物数据                        | 称号数据                        |
|---------------------------------|---------------------------------|
| ![宠物总览](docs/宠物总览.webp) | ![称号总览](docs/称号总览.webp) |

### 称号库

称号名称、价格、有效期、粒子、属性和上下架状态一目了然。

![称号库](docs/称号库.webp)

### 任务、地标与货币

查看任务完成进度、地标热力排行和各货币流通统计。

| 任务系统                        | 地标系统                        | 货币系统                        |
|---------------------------------|---------------------------------|---------------------------------|
| ![任务总览](docs/任务总览.webp) | ![地标总览](docs/地标总览.webp) | ![货币总览](docs/货币总览.webp) |

### 登录账户

查看玩家注册、登录和近期活跃情况。

![登录玩家列表](docs/登录玩家列表.webp)

## 支持的插件

| 插件           | 可查看内容                                   |
|----------------|----------------------------------------------|
| PlayerTime     | 在线人数、在线趋势、时长排行、玩家记录       |
| PlayerSignIn   | 签到趋势、签到排行、签到日历、补签卡         |
| AuthMe         | 注册与登录统计、活跃账户、账户详情           |
| CompanionsPlus | 宠物排行、宠物等级、出战状态、装备使用       |
| PlayerTitle    | 热门称号、称号库、佩戴状态、称号币           |
| PlayerTask     | 任务币、每日/NPC/卷轴任务、完成进度、任务库  |
| PlayerWarp     | 地标排行、地标库与详情、上架置顶、传送与收藏 |
| PlayerCurrency | 货币类型统计、余额排行、货币流水、玩家余额   |

## 快速开始

准备好 Node.js、pnpm 和一个可访问的 MySQL 数据库，然后运行：

```bash
pnpm install
pnpm dev
```

打开 <http://localhost:3000>，按页面提示完成设置：

1. 使用环境变量设置登录账号和密码。
2. 填写 MySQL 地址、端口、数据库名、用户名和密码。
3. 测试连接，确认检测到至少一个支持的插件。
4. 保存配置并进入分析面板。

## 本地测试配置

本地联调时，在项目根目录新建 `.env.local` 配置登录账号与MySQL连接

```dotenv
# 登录账号（必需）
AUTH_USERNAME=admin
AUTH_PASSWORD=123456

# MySQL 连接（设置了任意 MYSQL_* 变量后优先于设置页配置）
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=mc
MYSQL_USER=root
MYSQL_PASSWORD=123456
```

## 使用提醒

- HandyInsight 设计为个人管理工具，请勿在没有登录保护的情况下暴露到公网。
- 生产环境建议使用 HTTPS，并设置强登录密码。
- 玩家头像由 [mc-heads.net](https://mc-heads.net/) 提供，无法查询时会显示默认头像。
- 页面支持浅色、深色和跟随系统三种外观。

## 技术信息

HandyInsight 使用 Next.js、TypeScript、shadcn/ui 和 MySQL 构建，支持 Node.js 自托管与 EdgeOne Makers 部署。

项目采用可插拔结构，欢迎通过 Issue 或 Pull Request 提交新的插件支持。
