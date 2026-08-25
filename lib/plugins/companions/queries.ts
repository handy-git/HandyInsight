import type { RowDataPacket } from "mysql2/promise";

import { num } from "@/lib/common/format";
import type { SortOrder } from "@/lib/common/sort";
import type { Paginated } from "@/lib/common/types";
import {
  companionsUuidSchema,
  companionsPlayersQuerySchema,
} from "@/lib/plugins/companions/schemas";
import type {
  CompanionsEquipmentEntry,
  CompanionsOverview,
  CompanionsPlayerDetail,
  CompanionsPlayerItem,
  CompanionsRankEntry,
  CompanionsSortField,
} from "@/lib/plugins/companions/types";
import { createCache } from "@/lib/server/cache";
import { query } from "@/lib/server/mysql";

const PAGE_SIZE = 20;

export { companionsPlayersQuerySchema, companionsUuidSchema };

/* ---------- 总览与排行：30 秒进程内缓存（共享实现，命名空间隔离） ---------- */

const cached = createCache("companions");

export async function getCompanionsOverview(): Promise<CompanionsOverview> {
  return cached("overview", async () => {
    const rows = await query<RowDataPacket[]>(
      `SELECT
         (SELECT COUNT(DISTINCT player_uuid) FROM companions_owned) AS totalPlayers,
         (SELECT COUNT(*) FROM companions_active) AS activePlayers,
         (SELECT COUNT(*) FROM companions_owned) AS totalCompanions,
         (SELECT COALESCE(SUM(coins), 0) FROM companions_coin) AS totalCoins`,
    );
    const row = rows[0] ?? {};
    return {
      totalPlayers: num(row.totalPlayers),
      activePlayers: num(row.activePlayers),
      totalCompanions: num(row.totalCompanions),
      totalCoins: num(row.totalCoins),
    };
  });
}

/** 热门宠物排行（按持有玩家数）。 */
export async function getCompanionsRanking(): Promise<CompanionsRankEntry[]> {
  return cached("ranking", async () => {
    const rows = await query<RowDataPacket[]>(
      `SELECT companion, COUNT(DISTINCT player_uuid) AS players
         FROM companions_owned
        GROUP BY companion
        ORDER BY players DESC, companion ASC
        LIMIT 20`,
    );
    return rows.map((row, index) => ({
      rank: index + 1,
      companion: String(row.companion),
      players: Number(row.players),
    }));
  });
}

/** 装备使用排行（按使用玩家数）。 */
export async function getEquipmentRanking(): Promise<
  CompanionsEquipmentEntry[]
> {
  return cached("equipment-ranking", async () => {
    const rows = await query<RowDataPacket[]>(
      `SELECT equipment, COUNT(DISTINCT player_uuid) AS players
         FROM companions_equipment
        GROUP BY equipment
        ORDER BY players DESC, equipment ASC
        LIMIT 20`,
    );
    return rows.map((row) => ({
      equipment: String(row.equipment),
      players: Number(row.players),
    }));
  });
}

/* ---------- 玩家列表（搜索 + 服务端分页 + 动态排序） ---------- */

/** ORDER BY 白名单映射：全部是 GROUP BY 后 SELECT 里的别名。 */
const SORT_EXPR: Record<CompanionsSortField, string> = {
  name: "name",
  count: "companionCount",
  level: "maxAbilityLevel",
  coins: "coins",
};

export async function getCompanionsPlayers(
  keyword: string,
  page: number,
  sort: CompanionsSortField = "count",
  order: SortOrder = "desc",
): Promise<Paginated<CompanionsPlayerItem>> {
  const like = `%${keyword}%`;
  const offset = (page - 1) * PAGE_SIZE;
  const where = keyword ? "WHERE o.player_name LIKE ?" : "";
  const baseParams = keyword ? [like] : [];

  const rows = await query<RowDataPacket[]>(
    `SELECT o.player_uuid AS uuid,
            MAX(o.player_name) AS name,
            COUNT(*) AS companionCount,
            MAX(o.abilityLevel) AS maxAbilityLevel,
            (SELECT a.companion FROM companions_active a
              WHERE a.player_uuid = o.player_uuid LIMIT 1) AS activeCompanion,
            (SELECT c.coins FROM companions_coin c
              WHERE c.player_uuid = o.player_uuid LIMIT 1) AS coins
       FROM companions_owned o
       ${where}
      GROUP BY o.player_uuid
      ORDER BY ${SORT_EXPR[sort]} ${order.toUpperCase()}, name ASC
      LIMIT ? OFFSET ?`,
    [...baseParams, PAGE_SIZE, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT o.player_uuid) AS total
       FROM companions_owned o
       ${where}`,
    baseParams,
  );

  return {
    items: rows.map((row) => ({
      uuid: String(row.uuid),
      name: row.name ? String(row.name) : String(row.uuid).slice(0, 8),
      companionCount: Number(row.companionCount),
      activeCompanion: row.activeCompanion
        ? String(row.activeCompanion)
        : null,
      maxAbilityLevel: num(row.maxAbilityLevel),
      coins: row.coins === null || row.coins === undefined ? null : Number(row.coins),
    })),
    total: num(countRows[0]?.total),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 玩家宠物详情 ---------- */

export async function getCompanionsPlayerDetail(
  uuid: string,
): Promise<CompanionsPlayerDetail | null> {
  const [ownedRows, activeRows, coinRows, equipmentRows] = await Promise.all([
    query<RowDataPacket[]>(
      // 注意：该表列名为驼峰（customWeapon/customName/nameVisible/abilityLevel）
      `SELECT companion, customName, customWeapon, nameVisible, abilityLevel
         FROM companions_owned
        WHERE player_uuid = ?
        ORDER BY abilityLevel DESC, companion ASC`,
      [uuid],
    ),
    query<RowDataPacket[]>(
      `SELECT companion FROM companions_active WHERE player_uuid = ? LIMIT 1`,
      [uuid],
    ),
    query<RowDataPacket[]>(
      `SELECT coins FROM companions_coin WHERE player_uuid = ? LIMIT 1`,
      [uuid],
    ),
    query<RowDataPacket[]>(
      `SELECT equipment, companion
         FROM companions_equipment
        WHERE player_uuid = ?
        ORDER BY equipment ASC`,
      [uuid],
    ),
  ]);

  if (ownedRows.length === 0) {
    return null;
  }

  return {
    uuid,
    name: await resolvePlayerName(uuid),
    activeCompanion: activeRows[0]?.companion
      ? String(activeRows[0].companion)
      : null,
    coins:
      coinRows[0]?.coins === null || coinRows[0]?.coins === undefined
        ? null
        : Number(coinRows[0].coins),
    companions: ownedRows.map((row) => ({
      companion: String(row.companion),
      customName: row.customName ? String(row.customName) : null,
      customWeapon: row.customWeapon ? String(row.customWeapon) : null,
      nameVisible: num(row.nameVisible) === 1,
      abilityLevel: num(row.abilityLevel, 1),
    })),
    equipments: equipmentRows.map((row) => ({
      equipment: String(row.equipment),
      companion: row.companion ? String(row.companion) : null,
    })),
  };
}

async function resolvePlayerName(uuid: string): Promise<string> {
  const rows = await query<RowDataPacket[]>(
    `SELECT player_name AS name FROM companions_owned
      WHERE player_uuid = ? AND player_name IS NOT NULL LIMIT 1`,
    [uuid],
  );
  return rows[0]?.name ? String(rows[0].name) : uuid.slice(0, 8);
}
