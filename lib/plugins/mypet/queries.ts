import type { RowDataPacket } from "mysql2/promise";

import { num } from "@/lib/common/format";
import type { SortOrder } from "@/lib/common/sort";
import type { Paginated } from "@/lib/common/types";
import {
  mypetPlayersQuerySchema,
  mypetUuidSchema,
} from "@/lib/plugins/mypet/schemas";
import type {
  MypetOverview,
  MypetPlayerDetail,
  MypetPlayerItem,
  MypetPlayerRankEntry,
  MypetSortField,
  MypetTypeRankEntry,
} from "@/lib/plugins/mypet/types";
import { createCache } from "@/lib/server/cache";
import { query } from "@/lib/server/mysql";

const PAGE_SIZE = 20;

export { mypetPlayersQuerySchema, mypetUuidSchema };

/* ---------- 总览与排行：30 秒进程内缓存（共享实现，命名空间隔离） ---------- */

const cached = createCache("mypet");

/** 将 last_used（毫秒时间戳，bigint）归一化为 yyyy-MM-dd HH:mm:ss，0/空返回 NULL。 */
const LAST_USED_EXPR =
  "CASE WHEN last_used IS NULL OR last_used = 0 THEN NULL" +
  " ELSE FROM_UNIXTIME(last_used / 1000) END";

export async function getMypetOverview(): Promise<MypetOverview> {
  return cached("overview", async () => {
    const rows = await query<RowDataPacket[]>(
      `SELECT
         (SELECT COUNT(*) FROM mypet_pets) AS totalPets,
         (SELECT COUNT(DISTINCT owner_uuid) FROM mypet_pets) AS totalPlayers,
         (SELECT COUNT(DISTINCT type) FROM mypet_pets) AS totalTypes,
         (SELECT COUNT(DISTINCT world_group) FROM mypet_pets
           WHERE world_group IS NOT NULL) AS worldGroups`,
    );
    const row = rows[0] ?? {};
    return {
      totalPets: num(row.totalPets),
      totalPlayers: num(row.totalPlayers),
      totalTypes: num(row.totalTypes),
      worldGroups: num(row.worldGroups),
    };
  });
}

/** 宠物类型排行（按宠物数）。 */
export async function getMypetTypeRanking(): Promise<MypetTypeRankEntry[]> {
  return cached("type-ranking", async () => {
    const rows = await query<RowDataPacket[]>(
      `SELECT type, COUNT(*) AS pets
         FROM mypet_pets
        GROUP BY type
        ORDER BY pets DESC, type ASC
        LIMIT 20`,
    );
    return rows.map((row, index) => ({
      rank: index + 1,
      type: String(row.type),
      pets: Number(row.pets),
    }));
  });
}

/** 宠物最多的玩家排行（名字经 mypet_players 解析）。 */
export async function getMypetPlayerRanking(): Promise<MypetPlayerRankEntry[]> {
  return cached("player-ranking", async () => {
    const rows = await query<RowDataPacket[]>(
      `SELECT p.owner_uuid AS uuid, MAX(mp.name) AS name, COUNT(*) AS pets
         FROM mypet_pets p
         LEFT JOIN mypet_players mp ON mp.internal_uuid = p.owner_uuid
        GROUP BY p.owner_uuid
        ORDER BY pets DESC, uuid ASC
        LIMIT 20`,
    );
    return rows.map((row, index) => ({
      rank: index + 1,
      uuid: String(row.uuid),
      name: row.name ? String(row.name) : String(row.uuid).slice(0, 8),
      pets: Number(row.pets),
    }));
  });
}

/* ---------- 玩家列表（搜索 + 服务端分页 + 动态排序） ---------- */

/** ORDER BY 白名单映射：全部是 GROUP BY 后 SELECT 里的别名。 */
const SORT_EXPR: Record<MypetSortField, string> = {
  name: "name",
  count: "petCount",
  exp: "maxExp",
  spawned: "spawnedCount",
  used: "lastUsed",
};

export async function getMypetPlayers(
  keyword: string,
  page: number,
  sort: MypetSortField = "count",
  order: SortOrder = "desc",
): Promise<Paginated<MypetPlayerItem>> {
  const like = `%${keyword}%`;
  const offset = (page - 1) * PAGE_SIZE;
  const where = keyword ? "WHERE mp.name LIKE ?" : "";
  const baseParams = keyword ? [like] : [];

  const rows = await query<RowDataPacket[]>(
    `SELECT p.owner_uuid AS uuid,
            MAX(mp.name) AS name,
            COUNT(*) AS petCount,
            MAX(p.exp) AS maxExp,
            COALESCE(SUM(p.wants_to_spawn = 1), 0) AS spawnedCount,
            MAX(${LAST_USED_EXPR}) AS lastUsed
       FROM mypet_pets p
       LEFT JOIN mypet_players mp ON mp.internal_uuid = p.owner_uuid
       ${where}
      GROUP BY p.owner_uuid
      ORDER BY ${SORT_EXPR[sort]} ${order.toUpperCase()}, name ASC
      LIMIT ? OFFSET ?`,
    [...baseParams, PAGE_SIZE, offset],
  );
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT p.owner_uuid) AS total
       FROM mypet_pets p
       LEFT JOIN mypet_players mp ON mp.internal_uuid = p.owner_uuid
       ${where}`,
    baseParams,
  );

  return {
    items: rows.map((row) => ({
      uuid: String(row.uuid),
      name: row.name ? String(row.name) : String(row.uuid).slice(0, 8),
      petCount: Number(row.petCount),
      maxExp: num(row.maxExp),
      spawnedCount: Number(row.spawnedCount),
      lastUsedAt: row.lastUsed ? String(row.lastUsed) : null,
    })),
    total: num(countRows[0]?.total),
    page,
    pageSize: PAGE_SIZE,
  };
}

/* ---------- 玩家宠物详情 ---------- */

export async function getMypetPlayerDetail(
  uuid: string,
): Promise<MypetPlayerDetail | null> {
  const [petRows, nameRows] = await Promise.all([
    query<RowDataPacket[]>(
      `SELECT uuid, type, exp, health, respawn_time AS respawnTime,
              hunger, world_group AS worldGroup, wants_to_spawn AS wantsToSpawn,
              skilltree, ${LAST_USED_EXPR} AS lastUsed
         FROM mypet_pets
        WHERE owner_uuid = ?
        ORDER BY exp DESC, type ASC`,
      [uuid],
    ),
    query<RowDataPacket[]>(
      `SELECT name FROM mypet_players
        WHERE internal_uuid = ? AND name IS NOT NULL LIMIT 1`,
      [uuid],
    ),
  ]);

  if (petRows.length === 0) {
    return null;
  }

  return {
    uuid,
    name: nameRows[0]?.name ? String(nameRows[0].name) : uuid.slice(0, 8),
    pets: petRows.map((row) => ({
      uuid: String(row.uuid),
      type: String(row.type),
      exp: num(row.exp),
      health: num(row.health),
      respawnTime: num(row.respawnTime),
      hunger: num(row.hunger),
      worldGroup: row.worldGroup ? String(row.worldGroup) : null,
      wantsToSpawn: num(row.wantsToSpawn) === 1,
      skilltree: row.skilltree ? String(row.skilltree) : null,
      lastUsedAt: row.lastUsed ? String(row.lastUsed) : null,
    })),
  };
}
