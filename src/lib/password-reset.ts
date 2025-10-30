import crypto from "crypto";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "./db";

export type ResetCodeRecord = {
  id: number;
  code_hash: string;
  expires_at: Date;
};

let ensured = false;

export async function ensurePasswordResetTable() {
  if (ensured) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS PasswordResetCodes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      code_hash VARCHAR(128) NOT NULL,
      created_at DATETIME NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      INDEX idx_user_created (user_id, created_at),
      CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  ensured = true;
}

export function hashResetCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function storeResetCode(userId: number, code: string, ttlMinutes = 15) {
  await ensurePasswordResetTable();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await db.execute(
    "INSERT INTO PasswordResetCodes (user_id, code_hash, created_at, expires_at) VALUES (?, ?, NOW(), ?)",
    [userId, hashResetCode(code), expiresAt],
  );
}

export async function invalidateResetCodes(userId: number) {
  await ensurePasswordResetTable();
  await db.execute("DELETE FROM PasswordResetCodes WHERE user_id=?", [userId]);
}

export async function findValidResetCode(userId: number): Promise<ResetCodeRecord | null> {
  await ensurePasswordResetTable();
  const [rows] = await db.execute<
    (RowDataPacket & { id: number; code_hash: string; expires_at: Date })[]
  >(
    "SELECT id, code_hash, expires_at FROM PasswordResetCodes WHERE user_id=? AND used_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
    [userId],
  );
  return rows[0] ?? null;
}

export async function markResetCodeUsed(id: number) {
  await ensurePasswordResetTable();
  await db.execute("UPDATE PasswordResetCodes SET used_at=NOW() WHERE id=?", [id]);
}

export async function cleanupOldResetCodes(userId: number) {
  await ensurePasswordResetTable();
  await db.execute(
    "DELETE FROM PasswordResetCodes WHERE user_id=? AND (expires_at < NOW() OR used_at IS NOT NULL)",
    [userId],
  );
}
