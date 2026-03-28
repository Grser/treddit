import type { RowDataPacket } from "mysql2";

import { db, isDatabaseConfigured } from "@/lib/db";

let blocksTableReady = false;

type BlockRow = RowDataPacket & {
  blocker_id: number;
  blocked_id: number;
};

export async function ensureBlockTables() {
  if (blocksTableReady || !isDatabaseConfigured()) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS User_Blocks (
      blocker_id INT NOT NULL,
      blocked_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (blocker_id, blocked_id),
      INDEX idx_user_blocks_blocked (blocked_id),
      CONSTRAINT fk_user_blocks_blocker FOREIGN KEY (blocker_id) REFERENCES Users(id) ON DELETE CASCADE,
      CONSTRAINT fk_user_blocks_blocked FOREIGN KEY (blocked_id) REFERENCES Users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  blocksTableReady = true;
}

export async function blockUser(blockerId: number, blockedId: number) {
  if (!isDatabaseConfigured() || blockerId <= 0 || blockedId <= 0 || blockerId === blockedId) return;
  await ensureBlockTables();
  await db.execute(
    `INSERT INTO User_Blocks (blocker_id, blocked_id, created_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE created_at = NOW()`,
    [blockerId, blockedId],
  );
}

export async function unblockUser(blockerId: number, blockedId: number) {
  if (!isDatabaseConfigured() || blockerId <= 0 || blockedId <= 0 || blockerId === blockedId) return;
  await ensureBlockTables();
  await db.execute("DELETE FROM User_Blocks WHERE blocker_id = ? AND blocked_id = ?", [blockerId, blockedId]);
}

export async function hasBlocked(blockerId: number, blockedId: number): Promise<boolean> {
  if (!isDatabaseConfigured() || blockerId <= 0 || blockedId <= 0 || blockerId === blockedId) return false;
  await ensureBlockTables();
  const [rows] = await db.query<BlockRow[]>(
    `SELECT blocker_id, blocked_id
     FROM User_Blocks
     WHERE blocker_id = ? AND blocked_id = ?
     LIMIT 1`,
    [blockerId, blockedId],
  );
  return Boolean(rows[0]);
}

export async function getBlockRelation(userA: number, userB: number): Promise<{ aBlockedB: boolean; bBlockedA: boolean }> {
  if (!isDatabaseConfigured() || userA <= 0 || userB <= 0 || userA === userB) {
    return { aBlockedB: false, bBlockedA: false };
  }
  await ensureBlockTables();
  const [rows] = await db.query<Array<RowDataPacket & { blocker_id: number; blocked_id: number }>>(
    `SELECT blocker_id, blocked_id
     FROM User_Blocks
     WHERE (blocker_id = ? AND blocked_id = ?)
        OR (blocker_id = ? AND blocked_id = ?)` ,
    [userA, userB, userB, userA],
  );
  return {
    aBlockedB: rows.some((row) => Number(row.blocker_id) === userA && Number(row.blocked_id) === userB),
    bBlockedA: rows.some((row) => Number(row.blocker_id) === userB && Number(row.blocked_id) === userA),
  };
}
