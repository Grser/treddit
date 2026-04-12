import crypto from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";

import { db } from "@/lib/db";

let ensured = false;

type UserIdColumnRow = RowDataPacket & {
  column_type: string;
};

export async function ensureTwoFactorTables() {
  if (ensured) return;

  const [userIdRows] = await db.query<UserIdColumnRow[]>(
    `SELECT COLUMN_TYPE AS column_type
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'id'
     LIMIT 1`,
  );
  if (!userIdRows.length) return;

  const userIdColumnType = userIdRows[0].column_type.toUpperCase();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS UserAuthSettings (
      user_id ${userIdColumnType} NOT NULL PRIMARY KEY,
      two_factor_enabled TINYINT(1) NOT NULL DEFAULT 1,
      updated_at DATETIME NOT NULL,
      CONSTRAINT fk_user_auth_settings_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS LoginTwoFactorCodes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id ${userIdColumnType} NOT NULL,
      code_hash VARCHAR(128) NOT NULL,
      created_at DATETIME NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      INDEX idx_login_2fa_user_created (user_id, created_at),
      CONSTRAINT fk_login_2fa_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  ensured = true;
}

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function generateTwoFactorCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function ensureUserTwoFactorSettings(userId: number) {
  await ensureTwoFactorTables();
  await db.execute(
    "INSERT INTO UserAuthSettings (user_id, two_factor_enabled, updated_at) VALUES (?, 1, NOW()) ON DUPLICATE KEY UPDATE updated_at=updated_at",
    [userId],
  );
}

export async function isTwoFactorEnabled(userId: number) {
  await ensureUserTwoFactorSettings(userId);
  const [rows] = await db.execute<(RowDataPacket & { two_factor_enabled: number })[]>(
    "SELECT two_factor_enabled FROM UserAuthSettings WHERE user_id=? LIMIT 1",
    [userId],
  );
  return Boolean(rows[0]?.two_factor_enabled ?? 1);
}

export async function invalidateTwoFactorCodes(userId: number) {
  await ensureTwoFactorTables();
  await db.execute("DELETE FROM LoginTwoFactorCodes WHERE user_id=?", [userId]);
}

export async function storeTwoFactorCode(userId: number, code: string, ttlMinutes = 10) {
  await ensureTwoFactorTables();
  await db.execute(
    "INSERT INTO LoginTwoFactorCodes (user_id, code_hash, created_at, expires_at) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE))",
    [userId, hashCode(code), ttlMinutes],
  );
}

export async function validateTwoFactorCode(userId: number, code: string) {
  await ensureTwoFactorTables();
  const [rows] = await db.execute<(RowDataPacket & { id: number; code_hash: string })[]>(
    `SELECT id, code_hash
     FROM LoginTwoFactorCodes
     WHERE user_id=?
       AND used_at IS NULL
       AND expires_at > NOW()
       AND code_hash=?
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, hashCode(code)],
  );

  const record = rows[0];
  if (!record) return false;

  await db.execute("UPDATE LoginTwoFactorCodes SET used_at=NOW() WHERE id=?", [record.id]);
  return true;
}
