import type { RowDataPacket } from "mysql2";

import { db, isDatabaseConfigured } from "@/lib/db";

export type PostsMediaDownloadColumn = "allow_media_download";

let cachedMediaDownloadColumn: PostsMediaDownloadColumn | null | undefined;

export async function getPostsMediaDownloadColumn(): Promise<PostsMediaDownloadColumn | null> {
  if (!isDatabaseConfigured()) {
    if (cachedMediaDownloadColumn === undefined) {
      cachedMediaDownloadColumn = "allow_media_download";
    }
    return cachedMediaDownloadColumn;
  }

  if (cachedMediaDownloadColumn !== undefined) {
    return cachedMediaDownloadColumn;
  }

  try {
    const [rows] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM Posts LIKE 'allow_media_download'");
    cachedMediaDownloadColumn = rows.length > 0 ? "allow_media_download" : null;
    return cachedMediaDownloadColumn;
  } catch (error) {
    console.warn("No se pudo inspeccionar Posts.allow_media_download", error);
    cachedMediaDownloadColumn = null;
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

export async function ensurePostsMediaDownloadColumn(): Promise<PostsMediaDownloadColumn | null> {
  const existing = await getPostsMediaDownloadColumn();
  if (existing) return existing;

  if (!isDatabaseConfigured()) {
    cachedMediaDownloadColumn = "allow_media_download";
    return cachedMediaDownloadColumn;
  }

  try {
    await db.execute("ALTER TABLE Posts ADD COLUMN allow_media_download TINYINT(1) NOT NULL DEFAULT 1");
  } catch (error) {
    if (!isDuplicateSchemaError(error)) {
      console.warn("No se pudo crear Posts.allow_media_download", error);
      return null;
    }
  }

  cachedMediaDownloadColumn = undefined;
  return getPostsMediaDownloadColumn();
}
