import type { RowDataPacket } from "mysql2";

import { db, isDatabaseConfigured } from "@/lib/db";

export type PostsSensitiveColumn = "is_sensitive";

let cachedSensitiveColumn: PostsSensitiveColumn | null | undefined;

export async function getPostsSensitiveColumn(): Promise<PostsSensitiveColumn | null> {
  if (!isDatabaseConfigured()) {
    if (cachedSensitiveColumn === undefined) {
      cachedSensitiveColumn = "is_sensitive";
    }
    return cachedSensitiveColumn;
  }

  if (cachedSensitiveColumn !== undefined) {
    return cachedSensitiveColumn;
  }

  try {
    const [rows] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM Posts LIKE 'is_sensitive'");
    cachedSensitiveColumn = rows.length > 0 ? "is_sensitive" : null;
    return cachedSensitiveColumn;
  } catch (error) {
    console.warn("No se pudo inspeccionar Posts.is_sensitive", error);
    cachedSensitiveColumn = null;
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

export async function ensurePostsSensitiveColumn(): Promise<PostsSensitiveColumn | null> {
  const existing = await getPostsSensitiveColumn();
  if (existing) return existing;

  if (!isDatabaseConfigured()) {
    cachedSensitiveColumn = "is_sensitive";
    return cachedSensitiveColumn;
  }

  try {
    await db.execute("ALTER TABLE Posts ADD COLUMN is_sensitive TINYINT(1) NOT NULL DEFAULT 0");
  } catch (error) {
    if (!isDuplicateSchemaError(error)) {
      console.warn("No se pudo crear Posts.is_sensitive", error);
      return null;
    }
  }

  cachedSensitiveColumn = undefined;
  return getPostsSensitiveColumn();
}
