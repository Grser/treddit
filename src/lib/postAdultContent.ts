import type { RowDataPacket } from "mysql2";

import { db, isDatabaseConfigured } from "@/lib/db";

export type PostsAdultColumn = "is_adult";

let cachedAdultColumn: PostsAdultColumn | null | undefined;

export async function getPostsAdultColumn(): Promise<PostsAdultColumn | null> {
  if (!isDatabaseConfigured()) {
    if (cachedAdultColumn === undefined) {
      cachedAdultColumn = "is_adult";
    }
    return cachedAdultColumn;
  }

  if (cachedAdultColumn !== undefined) {
    return cachedAdultColumn;
  }

  try {
    const [rows] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM Posts LIKE 'is_adult'");
    cachedAdultColumn = rows.length > 0 ? "is_adult" : null;
    return cachedAdultColumn;
  } catch (error) {
    console.warn("No se pudo inspeccionar Posts.is_adult", error);
    cachedAdultColumn = null;
    return null;
  }
}

function isDuplicateSchemaError(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }
  const code = String((error as { code?: unknown }).code || "");
  return code === "ER_DUP_FIELDNAME" || code === "ER_DUP_KEYNAME";
}

export async function ensurePostsAdultColumn(): Promise<PostsAdultColumn | null> {
  const existing = await getPostsAdultColumn();
  if (existing) return existing;

  if (!isDatabaseConfigured()) {
    cachedAdultColumn = "is_adult";
    return cachedAdultColumn;
  }

  try {
    await db.execute("ALTER TABLE Posts ADD COLUMN is_adult TINYINT(1) NOT NULL DEFAULT 0");
  } catch (error) {
    if (!isDuplicateSchemaError(error)) {
      console.warn("No se pudo crear Posts.is_adult", error);
      return null;
    }
  }

  cachedAdultColumn = undefined;
  return getPostsAdultColumn();
}
