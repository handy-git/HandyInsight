# 2026-08-27 · LuckPerms 权限分析插件接入

## 目标

为 HandyInsight 添加 LuckPerms 权限管理插件兼容，遵循"有统计价值的表才纳入"原则。

## 表取舍

| 表 | 结论 | 理由 |
|---|---|---|
| `luckperms_players` | ✅ 核心门槛 | 玩家与主权限组映射，一切权限分析的入口 |
| `luckperms_group_permissions` | ✅ 核心门槛 | 组权限是权限体系的主体 |
| `luckperms_user_permissions` | ⚪ 可选降级 | 直接权限（玩家级），缺表时列置灰 |
| `luckperms_actions` | ⚪ 可选降级 | 操作日志/趋势，缺表时区块隐藏 |
| `luckperms_messenger` | ❌ 排除 | 内部跨服同步队列，非业务数据 |
| `luckperms_groups` | ❌ 排除 | 纯字典表，组分布可直接聚合得到 |
| `luckperms_tracks` | ❌ 排除 | 静态配置，统计价值低 |

## 新增/改动文件

**新增插件包** `lib/plugins/luckperms/`
- `queries.ts` — 总览 / 组列表 / 组详情 / 组内成员 / 玩家列表 / 日志统计 / 日志分页 / 玩家摘要；`fromUnixMillis()` 毫秒自适应；30s 缓存命名空间 `luckperms`
- `types.ts` — 共享类型 + 排序字段联合 + 默认排序常量
- `schemas.ts` — Zod 查询校验（keyword/page/sort/order）

**API** `app/api/luckperms/`
- `overview` / `groups` / `groups/[name]` / `groups/[name]/members` / `players` / `logs`，统一 `withPlugin("luckperms")` 守卫

**页面** `app/(analysis)/luckperms/`
- 总览（统计卡 + 组人数分布 + 权限数排行 + 最近操作）、权限组列表、组详情（成员 + 权限节点表）、权限玩家列表、操作日志（趋势图 + 类型分布 + 分页）

**接入点**
- `lib/common/plugins.ts` — 注册 luckperms 插件
- `lib/common/unified.ts` — `UnifiedPlayerItem.primaryGroup`、`detail.luckperms`
- `lib/server/player-registry.ts` — 玩家目录新增 `fetchLuckPerms`
- `lib/server/unified-players.ts` — STAT_SOURCES / DETAIL_SOURCES 新增 luckperms 源
- `app/(analysis)/overview/players/*` — 玩家列表"权限组"列 + 详情 StatTile
- `app/(analysis)/layout.tsx` — 侧边栏 LuckPerms · 权限分组（4 项导航）

## 关键实现点

- **可选表降级**：`tableExists()`（30s 缓存，捕获 `ER_NO_SUCH_TABLE`）+ `queryIfExists()`，缺表时返回 null / 置灰，沿用 playerguild 的 `guild_player_sign_in` 模式
- **毫秒时间戳**：`actions.time` / `expiry` 为毫秒 bigint，`fromUnixMillis()` 按 `> 10^12` 自适应秒/毫秒
- **组名 URL**：组名可能含 `+`，路径参数统一 `encodeURIComponent`
- **空组兜底**：组只有权限没有玩家时详情仍有效
- **排序防注入**：ORDER BY 走白名单映射

## 验证

- `pnpm exec tsc --noEmit` 通过（Exit 0）

## 已知限制

- `luckperms_actions.time` 未建索引时，30 天趋势查询可能全表扫描（DDL 未对该列建索引）
- 组详情权限列表 `LIMIT 300`，超大组仅展示前 300 条
- `luckperms_players.username` 小写存储，玩家目录名称桥接已做 `toLowerCase()` 归一化
