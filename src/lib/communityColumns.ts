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

function isDuplicateSchemaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  if (!("code" in error)) {
    return false;
  }

  const code = String((error as { code?: unknown }).code || "");
  return code === "ER_DUP_FIELDNAME" || code === "ER_DUP_KEYNAME" || code === "ER_FK_DUP_NAME";
}

export async function ensurePostsCommunityColumn(): Promise<PostsCommunityColumn | null> {
  const existing = await getPostsCommunityColumn();
  if (existing) {
    return existing;
  }

  if (!isDatabaseConfigured()) {
    cachedColumn = "community_id";
    return cachedColumn;
  }

  try {
    await db.execute("ALTER TABLE Posts ADD COLUMN community_id INT(10) UNSIGNED NULL");
  } catch (error) {
    if (!isDuplicateSchemaError(error)) {
      console.warn("No se pudo crear Posts.community_id", error);
      return null;
    }
  }

  try {
    await db.execute("ALTER TABLE Posts ADD INDEX idx_posts_community_id (community_id)");
  } catch (error) {
    if (!isDuplicateSchemaError(error)) {
      console.warn("No se pudo crear índice de comunidad en Posts", error);
    }
  }

  try {
    await db.execute(
      "ALTER TABLE Posts ADD CONSTRAINT fk_posts_community FOREIGN KEY (community_id) REFERENCES Communities(id) ON DELETE SET NULL ON UPDATE CASCADE",
    );
  } catch (error) {
    if (!isDuplicateSchemaError(error)) {
      console.warn("No se pudo crear clave foránea Posts -> Communities", error);
    }
  }

  cachedColumn = undefined;
  return getPostsCommunityColumn();
}

export function __resetPostsCommunityColumnForTests() {
  cachedColumn = undefined;
}
