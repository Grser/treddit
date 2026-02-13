import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { db, isDatabaseConfigured } from "@/lib/db";
import { appendDemoMessage, getDemoConversation } from "@/lib/demoStore";
import type { SessionUser } from "@/lib/auth";

let tablesReady = false;

export type DirectMessageAttachment = {
  url: string;
  type: "image" | "audio" | "video" | "file";
  name?: string | null;
};

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
  attachments?: DirectMessageAttachment[];
  replyTo?: {
    id: number;
    text: string;
    senderUsername: string;
    senderNickname: string | null;
  } | null;
};

export async function ensureMessageTables() {
  if (tablesReady || !isDatabaseConfigured()) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS Direct_Message_Preferences (
      user_id INT UNSIGNED PRIMARY KEY,
      allow_from_anyone TINYINT(1) NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_dmp_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS Direct_Messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT UNSIGNED NOT NULL,
      recipient_id INT UNSIGNED NOT NULL,
      message TEXT NOT NULL,
      attachments_json JSON NULL,
      reply_to_message_id INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_direct_pair (sender_id, recipient_id, created_at),
      INDEX idx_direct_reply (reply_to_message_id),
      CONSTRAINT fk_dm_sender FOREIGN KEY (sender_id) REFERENCES Users(id) ON DELETE CASCADE,
      CONSTRAINT fk_dm_recipient FOREIGN KEY (recipient_id) REFERENCES Users(id) ON DELETE CASCADE,
      CONSTRAINT fk_dm_reply FOREIGN KEY (reply_to_message_id) REFERENCES Direct_Messages(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  const [attachmentsColumn] = await db.query<RowDataPacket[]>(
    "SHOW COLUMNS FROM Direct_Messages LIKE 'attachments_json'",
  );
  if (!attachmentsColumn.length) {
    await db.execute("ALTER TABLE Direct_Messages ADD COLUMN attachments_json JSON NULL");
  }

  const [replyColumn] = await db.query<RowDataPacket[]>(
    "SHOW COLUMNS FROM Direct_Messages LIKE 'reply_to_message_id'",
  );
  if (!replyColumn.length) {
    await db.execute("ALTER TABLE Direct_Messages ADD COLUMN reply_to_message_id INT NULL");
    await db.execute(
      "ALTER TABLE Direct_Messages ADD CONSTRAINT fk_dm_reply FOREIGN KEY (reply_to_message_id) REFERENCES Direct_Messages(id) ON DELETE SET NULL",
    );
  }

  const [replyIndex] = await db.query<RowDataPacket[]>(
    "SHOW INDEX FROM Direct_Messages WHERE Key_name='idx_direct_reply'",
  );
  if (!replyIndex.length) {
    await db.execute("ALTER TABLE Direct_Messages ADD INDEX idx_direct_reply (reply_to_message_id)");
  }

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
  attachments_json: string | null;
  reply_id: number | null;
  reply_message: string | null;
  reply_sender_username: string | null;
  reply_sender_nickname: string | null;
};

type InsertedMessageRow = ConversationRow;

type ConversationSummaryRow = RowDataPacket & {
  other_user_id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: number;
  is_verified: number;
  message: string;
  created_at: Date | string;
  sender_id: number;
  unreadCount: number | null;
};

export type ConversationSummary = {
  userId: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_verified: boolean;
  lastMessage: string;
  lastSenderId: number;
  createdAt: string;
  unreadCount: number;
};

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
  if (!isDatabaseConfigured()) return true;
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
  afterId = 0,
): Promise<DirectMessageEntry[]> {
  if (!isDatabaseConfigured()) {
    return getDemoConversation(viewerId, otherId).filter((message) => message.id > Math.max(0, afterId));
  }
  await ensureMessageTables();
  const [rows] = await db.query<ConversationRow[]>(
    `
    SELECT
      dm.id,
      dm.sender_id,
      dm.recipient_id,
      dm.message,
      dm.attachments_json,
      dm.created_at,
      u.username,
      u.nickname,
      u.avatar_url,
      u.is_admin,
      u.is_verified,
      parent.id AS reply_id,
      parent.message AS reply_message,
      parent_sender.username AS reply_sender_username,
      parent_sender.nickname AS reply_sender_nickname
    FROM Direct_Messages dm
    JOIN Users u ON u.id = dm.sender_id
    LEFT JOIN Direct_Messages parent ON parent.id = dm.reply_to_message_id
    LEFT JOIN Users parent_sender ON parent_sender.id = parent.sender_id
    WHERE (
      (dm.sender_id = ? AND dm.recipient_id = ?)
      OR (dm.sender_id = ? AND dm.recipient_id = ?)
    )
      AND dm.id > ?
    ORDER BY dm.created_at ASC
    LIMIT ?
    `,
    [viewerId, otherId, otherId, viewerId, Math.max(0, afterId), Math.max(1, Math.min(limit, 200))],
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
    attachments: parseAttachments(row.attachments_json),
    replyTo: row.reply_id
      ? {
          id: Number(row.reply_id),
          text: String(row.reply_message ?? ""),
          senderUsername: String(row.reply_sender_username ?? ""),
          senderNickname: row.reply_sender_nickname ? String(row.reply_sender_nickname) : null,
        }
      : null,
  }));
}

function parseAttachments(raw: string | null): DirectMessageAttachment[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const url = typeof row.url === "string" ? row.url.trim() : "";
        const type =
          row.type === "image" || row.type === "audio" || row.type === "video" || row.type === "file"
            ? row.type
            : "file";
        const name = typeof row.name === "string" ? row.name : null;
        if (!url) return null;
        return { url, type, name } satisfies DirectMessageAttachment;
      })
      .filter(Boolean) as DirectMessageAttachment[];
  } catch {
    return [];
  }
}

export async function fetchConversationSummaries(
  userId: number,
  options: { limit?: number; lastSeen?: number } = {},
): Promise<ConversationSummary[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }
  await ensureMessageTables();
  const limit = Math.max(1, Math.min(options.limit ?? 40, 200));
  const lastSeen = Number.isFinite(options.lastSeen) && (options.lastSeen ?? 0) > 0 ? Number(options.lastSeen) : 0;

  const [rows] = await db.query<ConversationSummaryRow[]>(
    `
    SELECT
      other.id AS other_user_id,
      other.username,
      other.nickname,
      other.avatar_url,
      other.is_admin,
      other.is_verified,
      dm.message,
      dm.created_at,
      dm.sender_id,
      (
        SELECT COUNT(*)
        FROM Direct_Messages unread
        WHERE unread.sender_id = other.id
          AND unread.recipient_id = ?
          AND unread.created_at > FROM_UNIXTIME(? / 1000)
      ) AS unreadCount
    FROM (
      SELECT MAX(id) AS id
      FROM Direct_Messages
      WHERE sender_id = ? OR recipient_id = ?
      GROUP BY LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id)
    ) latest
    JOIN Direct_Messages dm ON dm.id = latest.id
    JOIN Users other ON other.id = CASE WHEN dm.sender_id = ? THEN dm.recipient_id ELSE dm.sender_id END
    ORDER BY dm.created_at DESC
    LIMIT ?
    `,
    [userId, lastSeen, userId, userId, userId, userId, limit],
  );

  return rows.map((row) => ({
    userId: Number(row.other_user_id),
    username: String(row.username),
    nickname: row.nickname ? String(row.nickname) : null,
    avatar_url: row.avatar_url ? String(row.avatar_url) : null,
    is_admin: Boolean(row.is_admin),
    is_verified: Boolean(row.is_verified),
    lastMessage: String(row.message ?? ""),
    lastSenderId: Number(row.sender_id),
    createdAt: new Date(row.created_at).toISOString(),
    unreadCount: Number(row.unreadCount ?? 0),
  }));
}

export async function createDirectMessage(
  sender: SessionUser,
  recipientId: number,
  text: string,
  attachments: DirectMessageAttachment[] = [],
  replyToMessageId?: number | null,
): Promise<DirectMessageEntry> {
  if (!isDatabaseConfigured()) {
    return appendDemoMessage(sender, recipientId, text.trim(), attachments, replyToMessageId);
  }
  const normalized = text.trim().slice(0, 1000);
  if (!normalized) {
    throw new Error("EMPTY_MESSAGE");
  }
  await ensureMessageTables();
  let normalizedReplyToId: number | null = null;
  if (Number.isFinite(replyToMessageId) && Number(replyToMessageId) > 0) {
    const candidate = Number(replyToMessageId);
    const [replyRows] = await db.query<RowDataPacket[]>(
      `SELECT id FROM Direct_Messages
       WHERE id = ?
         AND ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))
       LIMIT 1`,
      [candidate, sender.id, recipientId, recipientId, sender.id],
    );
    if (replyRows[0]?.id) {
      normalizedReplyToId = Number(replyRows[0].id);
    }
  }
  const [result] = await db.execute<ResultSetHeader>(
    "INSERT INTO Direct_Messages (sender_id, recipient_id, message, attachments_json, reply_to_message_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
    [sender.id, recipientId, normalized, JSON.stringify(attachments), normalizedReplyToId],
  );
  const insertId = (result as ResultSetHeader).insertId;
  const [rows] = await db.query<InsertedMessageRow[]>(
    `
    SELECT
      dm.id,
      dm.sender_id,
      dm.recipient_id,
      dm.message,
      dm.attachments_json,
      dm.created_at,
      u.username,
      u.nickname,
      u.avatar_url,
      u.is_admin,
      u.is_verified,
      parent.id AS reply_id,
      parent.message AS reply_message,
      parent_sender.username AS reply_sender_username,
      parent_sender.nickname AS reply_sender_nickname
    FROM Direct_Messages dm
    JOIN Users u ON u.id = dm.sender_id
    LEFT JOIN Direct_Messages parent ON parent.id = dm.reply_to_message_id
    LEFT JOIN Users parent_sender ON parent_sender.id = parent.sender_id
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
    attachments: parseAttachments(row.attachments_json),
    replyTo: row.reply_id
      ? {
          id: Number(row.reply_id),
          text: String(row.reply_message ?? ""),
          senderUsername: String(row.reply_sender_username ?? ""),
          senderNickname: row.reply_sender_nickname ? String(row.reply_sender_nickname) : null,
        }
      : null,
  };
}
