import type { RowDataPacket } from "mysql2";

import { db, isDatabaseConfigured } from "@/lib/db";

export type PostsCommunityColumn = "community_id" | "communityId" | "community";

let cachedColumn: PostsCommunityColumn | null | undefined;

export async function getPostsCommunityColumn(): Promise<PostsCommunityColumn | null> {
  if (!isDatabaseConfigured()) {
    if (cachedColumn === undefined) {
      cachedColumn = "community_id";
    }
    return cachedColumn;
  }

  if (cachedColumn !== undefined) {
    return cachedColumn;
  }

  const candidates: PostsCommunityColumn[] = ["community_id", "communityId", "community"];
  for (const column of candidates) {
    try {
      const [rows] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM Posts LIKE ?", [column]);
      if (rows.length > 0) {
        cachedColumn = column;
        return column;
      }
    } catch (error) {
      console.warn(`No se pudo inspeccionar la columna ${column} de Posts`, error);
    }
  }

  cachedColumn = null;
  return null;
}

export function __resetPostsCommunityColumnForTests() {
  cachedColumn = undefined;
}
