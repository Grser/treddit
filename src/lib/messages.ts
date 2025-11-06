import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { db, isDatabaseConfigured } from "@/lib/db";

let tablesReady = false;

export type DirectMessageEntry = {
  id: number;
  senderId: number;
  recipientId: number;
  text: string;
  createdAt: string;
  sender: {
    username: string;
    nickname: string | null;
    avatar_url: string | null;
    is_admin: boolean;
    is_verified: boolean;
  };
};

export async function ensureMessageTables() {
  if (tablesReady || !isDatabaseConfigured()) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS Direct_Message_Preferences (
      user_id INT PRIMARY KEY,
      allow_from_anyone TINYINT(1) NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_dmp_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS Direct_Messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      recipient_id INT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_direct_pair (sender_id, recipient_id, created_at),
      CONSTRAINT fk_dm_sender FOREIGN KEY (sender_id) REFERENCES Users(id) ON DELETE CASCADE,
      CONSTRAINT fk_dm_recipient FOREIGN KEY (recipient_id) REFERENCES Users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  tablesReady = true;
}

type AllowPreferenceRow = RowDataPacket & {
  allow_from_anyone: number;
};

type FollowRelationRow = RowDataPacket & {
  iFollow: number;
  followsMe: number;
};

type ConversationRow = RowDataPacket & {
  id: number;
  sender_id: number;
  recipient_id: number;
  message: string;
  created_at: Date | string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: number;
  is_verified: number;
};

type InsertedMessageRow = ConversationRow;

export async function getAllowMessagesFromAnyone(userId: number): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  await ensureMessageTables();
  const [rows] = await db.query<AllowPreferenceRow[]>(
    "SELECT allow_from_anyone FROM Direct_Message_Preferences WHERE user_id=? LIMIT 1",
    [userId],
  );
  const row = rows[0];
  return row ? Boolean(row.allow_from_anyone) : false;
}

export async function setAllowMessagesFromAnyone(userId: number, allow: boolean) {
  if (!isDatabaseConfigured()) return;
  await ensureMessageTables();
  await db.execute(
    `INSERT INTO Direct_Message_Preferences (user_id, allow_from_anyone, updated_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE allow_from_anyone=VALUES(allow_from_anyone), updated_at=NOW()`,
    [userId, allow ? 1 : 0],
  );
}

export async function canSendDirectMessage(senderId: number, recipientId: number): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  await ensureMessageTables();
  const [rows] = await db.query<FollowRelationRow[]>(
    `
    SELECT
      EXISTS(SELECT 1 FROM Follows WHERE follower=? AND followed=?) AS iFollow,
      EXISTS(SELECT 1 FROM Follows WHERE follower=? AND followed=?) AS followsMe
    `,
    [senderId, recipientId, recipientId, senderId],
  );
  const relation = rows[0] || { iFollow: 0, followsMe: 0 };
  const mutual = Boolean(relation.iFollow) && Boolean(relation.followsMe);
  if (mutual) return true;
  return getAllowMessagesFromAnyone(recipientId);
}

export async function fetchConversationMessages(
  viewerId: number,
  otherId: number,
  limit = 80,
): Promise<DirectMessageEntry[]> {
  if (!isDatabaseConfigured()) return [];
  await ensureMessageTables();
  const [rows] = await db.query<ConversationRow[]>(
    `
    SELECT
      dm.id,
      dm.sender_id,
      dm.recipient_id,
      dm.message,
      dm.created_at,
      u.username,
      u.nickname,
      u.avatar_url,
      u.is_admin,
      u.is_verified
    FROM Direct_Messages dm
    JOIN Users u ON u.id = dm.sender_id
    WHERE (dm.sender_id = ? AND dm.recipient_id = ?)
       OR (dm.sender_id = ? AND dm.recipient_id = ?)
    ORDER BY dm.created_at ASC
    LIMIT ?
    `,
    [viewerId, otherId, otherId, viewerId, Math.max(1, Math.min(limit, 200))],
  );

  return rows.map((row) => ({
    id: Number(row.id),
    senderId: Number(row.sender_id),
    recipientId: Number(row.recipient_id),
    text: String(row.message),
    createdAt: new Date(row.created_at).toISOString(),
    sender: {
      username: String(row.username),
      nickname: row.nickname ? String(row.nickname) : null,
      avatar_url: row.avatar_url ? String(row.avatar_url) : null,
      is_admin: Boolean(row.is_admin),
      is_verified: Boolean(row.is_verified),
    },
  }));
}

export async function createDirectMessage(
  senderId: number,
  recipientId: number,
  text: string,
): Promise<DirectMessageEntry> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }
  const normalized = text.trim().slice(0, 1000);
  if (!normalized) {
    throw new Error("EMPTY_MESSAGE");
  }
  await ensureMessageTables();
  const [result] = await db.execute<ResultSetHeader>(
    "INSERT INTO Direct_Messages (sender_id, recipient_id, message, created_at) VALUES (?, ?, ?, NOW())",
    [senderId, recipientId, normalized],
  );
  const insertId = (result as ResultSetHeader).insertId;
  const [rows] = await db.query<InsertedMessageRow[]>(
    `
    SELECT
      dm.id,
      dm.sender_id,
      dm.recipient_id,
      dm.message,
      dm.created_at,
      u.username,
      u.nickname,
      u.avatar_url,
      u.is_admin,
      u.is_verified
    FROM Direct_Messages dm
    JOIN Users u ON u.id = dm.sender_id
    WHERE dm.id = ?
    LIMIT 1
    `,
    [insertId],
  );
  const row = rows[0];
  if (!row) {
    throw new Error("MESSAGE_NOT_FOUND");
  }
  return {
    id: Number(row.id),
    senderId: Number(row.sender_id),
    recipientId: Number(row.recipient_id),
    text: String(row.message),
    createdAt: new Date(row.created_at).toISOString(),
    sender: {
      username: String(row.username),
      nickname: row.nickname ? String(row.nickname) : null,
      avatar_url: row.avatar_url ? String(row.avatar_url) : null,
      is_admin: Boolean(row.is_admin),
      is_verified: Boolean(row.is_verified),
    },
  };
}
