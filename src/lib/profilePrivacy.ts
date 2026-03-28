import type { RowDataPacket } from "mysql2";

import { db, isDatabaseConfigured } from "@/lib/db";

type PrivateStatusRow = RowDataPacket & {
  is_private: number;
};

type FollowRequestRow = RowDataPacket & {
  id: number;
};

let ensuredPrivacySchema = false;

export async function ensureProfilePrivacySchema() {
  if (ensuredPrivacySchema || !isDatabaseConfigured()) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS Follow_Requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      requester_id INT NOT NULL,
      target_id INT NOT NULL,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_follow_request (requester_id, target_id),
      INDEX idx_follow_request_target_status (target_id, status),
      INDEX idx_follow_request_requester_status (requester_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [privateColumn] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM Users LIKE 'is_private'");
  if (!privateColumn.length) {
    await db.execute("ALTER TABLE Users ADD COLUMN is_private TINYINT(1) NOT NULL DEFAULT 0");
  }

  ensuredPrivacySchema = true;
}

export async function getUserPrivateStatus(userId: number) {
  await ensureProfilePrivacySchema();
  const [rows] = await db.query<PrivateStatusRow[]>("SELECT is_private FROM Users WHERE id=? LIMIT 1", [userId]);
  return Boolean(rows[0]?.is_private);
}

export async function hasPendingFollowRequest(requesterId: number, targetId: number) {
  await ensureProfilePrivacySchema();
  const [rows] = await db.query<FollowRequestRow[]>(
    "SELECT id FROM Follow_Requests WHERE requester_id=? AND target_id=? AND status='pending' LIMIT 1",
    [requesterId, targetId],
  );
  return Boolean(rows[0]?.id);
}
