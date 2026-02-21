import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { db, isDatabaseConfigured } from "@/lib/db";
import { appendDemoMessage, getDemoConversation } from "@/lib/demoStore";
import type { SessionUser } from "@/lib/auth";

let tablesReady = false;

export type DirectMessageAttachment = {
  url: string;
  type: "image" | "audio" | "video" | "file";
  name?: string | null;
  durationSeconds?: number | null;
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
  reactions?: Array<{
    emoji: string;
    userId: number;
    username: string;
  }>;
};

export type GroupConversationSummary = {
  id: number;
  name: string;
  avatarUrl: string | null;
  description: string | null;
  createdAt: string;
  lastMessage: string;
  lastSenderId: number;
  unreadCount: number;
};

export type GroupMessageEntry = {
  id: number;
  groupId: number;
  senderId: number;
  text: string;
  createdAt: string;
  sender: {
    id: number;
    username: string;
    nickname: string | null;
    avatar_url: string | null;
  };
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
  await db.execute(`
    CREATE TABLE IF NOT EXISTS Direct_Message_Read_State (
      user_id INT UNSIGNED NOT NULL,
      other_user_id INT UNSIGNED NOT NULL,
      last_read_message_id INT NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, other_user_id),
      INDEX idx_dmrs_other (other_user_id),
      CONSTRAINT fk_dmrs_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
      CONSTRAINT fk_dmrs_other_user FOREIGN KEY (other_user_id) REFERENCES Users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS Direct_Message_Reactions (
      message_id INT NOT NULL,
      user_id INT UNSIGNED NOT NULL,
      emoji VARCHAR(16) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (message_id, user_id),
      INDEX idx_dm_reactions_message (message_id),
      CONSTRAINT fk_dm_reactions_message FOREIGN KEY (message_id) REFERENCES Direct_Messages(id) ON DELETE CASCADE,
      CONSTRAINT fk_dm_reactions_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS Direct_Message_Groups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      description VARCHAR(255) NULL,
      avatar_url VARCHAR(255) NULL,
      created_by INT UNSIGNED NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_dm_groups_creator FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  const [descriptionColumn] = await db.query<RowDataPacket[]>(
    "SHOW COLUMNS FROM Direct_Message_Groups LIKE 'description'",
  );
  if (!descriptionColumn.length) {
    await db.execute("ALTER TABLE Direct_Message_Groups ADD COLUMN description VARCHAR(255) NULL");
  }
  await db.execute(`
    CREATE TABLE IF NOT EXISTS Direct_Message_Group_Members (
      group_id INT NOT NULL,
      user_id INT UNSIGNED NOT NULL,
      last_read_message_id INT NOT NULL DEFAULT 0,
      joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (group_id, user_id),
      INDEX idx_dm_group_members_user (user_id),
      CONSTRAINT fk_dm_group_members_group FOREIGN KEY (group_id) REFERENCES Direct_Message_Groups(id) ON DELETE CASCADE,
      CONSTRAINT fk_dm_group_members_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS Direct_Message_Group_Messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_id INT NOT NULL,
      sender_id INT UNSIGNED NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_dm_group_messages_group (group_id, created_at),
      CONSTRAINT fk_dm_group_messages_group FOREIGN KEY (group_id) REFERENCES Direct_Message_Groups(id) ON DELETE CASCADE,
      CONSTRAINT fk_dm_group_messages_sender FOREIGN KEY (sender_id) REFERENCES Users(id) ON DELETE CASCADE
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

type DirectMessageAccessRow = FollowRelationRow & {
  allowFromAnyone: number;
};

export type DirectMessageAccess = {
  canMessage: boolean;
  allowsAnyone: boolean;
  mutualFollow: boolean;
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
  reactions_json: string | null;
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

type ConversationStarterRow = RowDataPacket & {
  user_id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: number;
  is_verified: number;
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

export async function getDirectMessageAccess(senderId: number, recipientId: number): Promise<DirectMessageAccess> {
  if (!isDatabaseConfigured()) {
    return { canMessage: true, allowsAnyone: true, mutualFollow: true };
  }
  await ensureMessageTables();
  const [rows] = await db.query<DirectMessageAccessRow[]>(
    `
    SELECT
      EXISTS(SELECT 1 FROM Follows WHERE follower=? AND followed=?) AS iFollow,
      EXISTS(SELECT 1 FROM Follows WHERE follower=? AND followed=?) AS followsMe,
      COALESCE((SELECT allow_from_anyone FROM Direct_Message_Preferences WHERE user_id=? LIMIT 1), 0) AS allowFromAnyone
    `,
    [senderId, recipientId, recipientId, senderId, recipientId],
  );
  const relation = rows[0] || { iFollow: 0, followsMe: 0, allowFromAnyone: 0 };
  const mutualFollow = Boolean(relation.iFollow) && Boolean(relation.followsMe);
  const allowsAnyone = Boolean(relation.allowFromAnyone);
  return {
    canMessage: mutualFollow || allowsAnyone,
    allowsAnyone,
    mutualFollow,
  };
}

export async function canSendDirectMessage(senderId: number, recipientId: number): Promise<boolean> {
  const access = await getDirectMessageAccess(senderId, recipientId);
  return access.canMessage;
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
      parent_sender.nickname AS reply_sender_nickname,
      (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT('emoji', reactions.emoji, 'userId', reactions.user_id, 'username', reaction_user.username)
        )
        FROM Direct_Message_Reactions reactions
        JOIN Users reaction_user ON reaction_user.id = reactions.user_id
        WHERE reactions.message_id = dm.id
      ) AS reactions_json
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
    reactions: parseReactions(row.reactions_json),
  }));
}

function parseReactions(raw: string | null): DirectMessageEntry["reactions"] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const data = item as Record<string, unknown>;
        const emoji = typeof data.emoji === "string" ? data.emoji : "";
        const userId = Number(data.userId);
        const username = typeof data.username === "string" ? data.username : "";
        if (!emoji || !Number.isFinite(userId) || !username) return null;
        return { emoji, userId, username };
      })
      .filter(Boolean) as DirectMessageEntry["reactions"];
  } catch {
    return [];
  }
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
        const durationSeconds =
          typeof row.durationSeconds === "number" && Number.isFinite(row.durationSeconds)
            ? Math.max(0, Math.min(Math.round(row.durationSeconds), 60))
            : null;
        if (!url) return null;
        return { url, type, name, durationSeconds } satisfies DirectMessageAttachment;
      })
      .filter(Boolean) as DirectMessageAttachment[];
  } catch {
    return [];
  }
}

export async function fetchConversationSummaries(
  userId: number,
  options: { limit?: number } = {},
): Promise<ConversationSummary[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }
  await ensureMessageTables();
  const limit = Math.max(1, Math.min(options.limit ?? 40, 200));
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
        LEFT JOIN Direct_Message_Read_State dmrs
          ON dmrs.user_id = ?
         AND dmrs.other_user_id = other.id
        WHERE unread.sender_id = other.id
          AND unread.recipient_id = ?
          AND unread.id > COALESCE(dmrs.last_read_message_id, 0)
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
    [userId, userId, userId, userId, userId, userId, limit],
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

export async function fetchConversationStarters(
  userId: number,
  options: { limit?: number } = {},
): Promise<ConversationSummary[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  await ensureMessageTables();
  const limit = Math.max(1, Math.min(options.limit ?? 20, 100));
  const [rows] = await db.query<ConversationStarterRow[]>(
    `
    SELECT
      u.id AS user_id,
      u.username,
      u.nickname,
      u.avatar_url,
      u.is_admin,
      u.is_verified
    FROM Follows outgoing
    JOIN Follows incoming
      ON incoming.follower = outgoing.followed
     AND incoming.followed = outgoing.follower
    JOIN Users u ON u.id = outgoing.followed
    WHERE outgoing.follower = ?
      AND u.id <> ?
      AND NOT EXISTS (
        SELECT 1
        FROM Direct_Messages dm
        WHERE LEAST(dm.sender_id, dm.recipient_id) = LEAST(?, u.id)
          AND GREATEST(dm.sender_id, dm.recipient_id) = GREATEST(?, u.id)
      )
    ORDER BY u.username ASC
    LIMIT ?
    `,
    [userId, userId, userId, userId, limit],
  );

  const createdAt = new Date(0).toISOString();
  return rows.map((row) => ({
    userId: Number(row.user_id),
    username: String(row.username),
    nickname: row.nickname ? String(row.nickname) : null,
    avatar_url: row.avatar_url ? String(row.avatar_url) : null,
    is_admin: Boolean(row.is_admin),
    is_verified: Boolean(row.is_verified),
    lastMessage: "",
    lastSenderId: 0,
    createdAt,
    unreadCount: 0,
  }));
}

export async function markConversationRead(userId: number, otherUserId: number) {
  if (!isDatabaseConfigured()) return;
  await ensureMessageTables();
  await db.execute(
    `INSERT INTO Direct_Message_Read_State (user_id, other_user_id, last_read_message_id, updated_at)
     SELECT ?, ?, COALESCE(MAX(id), 0), NOW()
     FROM Direct_Messages
     WHERE sender_id = ? AND recipient_id = ?
     ON DUPLICATE KEY UPDATE
      last_read_message_id = GREATEST(last_read_message_id, VALUES(last_read_message_id)),
      updated_at = NOW()`,
    [userId, otherUserId, otherUserId, userId],
  );
}

export async function markAllConversationsRead(userId: number) {
  if (!isDatabaseConfigured()) return;
  await ensureMessageTables();
  await db.execute(
    `INSERT INTO Direct_Message_Read_State (user_id, other_user_id, last_read_message_id, updated_at)
     SELECT ?, incoming.sender_id, MAX(incoming.id), NOW()
     FROM Direct_Messages incoming
     WHERE incoming.recipient_id = ?
     GROUP BY incoming.sender_id
     ON DUPLICATE KEY UPDATE
      last_read_message_id = GREATEST(last_read_message_id, VALUES(last_read_message_id)),
      updated_at = NOW()`,
    [userId, userId],
  );
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
  if (!normalized && attachments.length === 0) {
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
      parent_sender.nickname AS reply_sender_nickname,
      NULL AS reactions_json
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
    reactions: [],
  };
}

export async function setDirectMessageReaction(userId: number, messageId: number, emoji: string) {
  if (!isDatabaseConfigured()) return;
  await ensureMessageTables();
  const normalized = emoji.trim().slice(0, 16);
  if (!normalized) throw new Error("INVALID_EMOJI");

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id
     FROM Direct_Messages
     WHERE id = ?
       AND (sender_id = ? OR recipient_id = ?)
     LIMIT 1`,
    [messageId, userId, userId],
  );
  if (!rows[0]?.id) {
    throw new Error("MESSAGE_NOT_FOUND");
  }

  await db.execute(
    `INSERT INTO Direct_Message_Reactions (message_id, user_id, emoji, created_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE emoji=VALUES(emoji), created_at=NOW()`,
    [messageId, userId, normalized],
  );
}

export async function createGroupConversation(creatorId: number, name: string, memberIds: number[], options?: { description?: string; avatarUrl?: string }) {
  if (!isDatabaseConfigured()) {
    throw new Error("DB_REQUIRED");
  }
  await ensureMessageTables();
  const normalizedName = name.trim().slice(0, 120);
  const normalizedDescription = options?.description?.trim().slice(0, 255) || null;
  const normalizedAvatarUrl = options?.avatarUrl?.trim().slice(0, 255) || null;
  if (!normalizedName) throw new Error("INVALID_GROUP_NAME");

  const uniqueMembers = [...new Set(memberIds.filter((id) => Number.isFinite(id) && id > 0))];
  const allMembers = [...new Set([creatorId, ...uniqueMembers])];
  if (allMembers.length < 2) throw new Error("GROUP_NEEDS_MEMBERS");

  const [result] = await db.execute<ResultSetHeader>(
    "INSERT INTO Direct_Message_Groups (name, description, avatar_url, created_by, created_at) VALUES (?, ?, ?, ?, NOW())",
    [normalizedName, normalizedDescription, normalizedAvatarUrl, creatorId],
  );
  const groupId = Number(result.insertId);

  for (const userId of allMembers) {
    await db.execute(
      "INSERT INTO Direct_Message_Group_Members (group_id, user_id, last_read_message_id, joined_at) VALUES (?, ?, 0, NOW())",
      [groupId, userId],
    );
  }

  return groupId;
}

export async function fetchGroupConversations(userId: number): Promise<GroupConversationSummary[]> {
  if (!isDatabaseConfigured()) return [];
  await ensureMessageTables();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT
       g.id,
       g.name,
       g.description,
       g.avatar_url,
       g.created_at,
       COALESCE(last_message.message, '') AS last_message,
       COALESCE(last_message.sender_id, 0) AS last_sender_id,
       (
         SELECT COUNT(*)
         FROM Direct_Message_Group_Messages unread
         WHERE unread.group_id = g.id
           AND unread.id > gm.last_read_message_id
           AND unread.sender_id <> ?
       ) AS unread_count
     FROM Direct_Message_Group_Members gm
     JOIN Direct_Message_Groups g ON g.id = gm.group_id
     LEFT JOIN Direct_Message_Group_Messages last_message ON last_message.id = (
       SELECT MAX(inner_msg.id)
       FROM Direct_Message_Group_Messages inner_msg
       WHERE inner_msg.group_id = g.id
     )
     WHERE gm.user_id = ?
     ORDER BY COALESCE(last_message.created_at, g.created_at) DESC
     LIMIT 50`,
    [userId, userId],
  );

  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    createdAt: new Date(row.created_at).toISOString(),
    lastMessage: String(row.last_message ?? ""),
    lastSenderId: Number(row.last_sender_id ?? 0),
    unreadCount: Number(row.unread_count ?? 0),
  }));
}

export async function fetchGroupMessages(userId: number, groupId: number, afterId = 0): Promise<GroupMessageEntry[]> {
  if (!isDatabaseConfigured()) return [];
  await ensureMessageTables();
  const [membership] = await db.query<RowDataPacket[]>(
    "SELECT group_id FROM Direct_Message_Group_Members WHERE group_id=? AND user_id=? LIMIT 1",
    [groupId, userId],
  );
  if (!membership[0]?.group_id) return [];

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT msg.id, msg.group_id, msg.sender_id, msg.message, msg.created_at,
            u.id AS user_id, u.username, u.nickname, u.avatar_url
     FROM Direct_Message_Group_Messages msg
     JOIN Users u ON u.id = msg.sender_id
     WHERE msg.group_id=? AND msg.id > ?
     ORDER BY msg.created_at ASC
     LIMIT 100`,
    [groupId, Math.max(0, afterId)],
  );

  return rows.map((row) => ({
    id: Number(row.id),
    groupId: Number(row.group_id),
    senderId: Number(row.sender_id),
    text: String(row.message),
    createdAt: new Date(row.created_at).toISOString(),
    sender: {
      id: Number(row.user_id),
      username: String(row.username),
      nickname: row.nickname ? String(row.nickname) : null,
      avatar_url: row.avatar_url ? String(row.avatar_url) : null,
    },
  }));
}

export async function sendGroupMessage(userId: number, groupId: number, text: string): Promise<GroupMessageEntry> {
  if (!isDatabaseConfigured()) throw new Error("DB_REQUIRED");
  await ensureMessageTables();
  const normalized = text.trim().slice(0, 1000);
  if (!normalized) throw new Error("EMPTY_MESSAGE");
  const [membership] = await db.query<RowDataPacket[]>(
    "SELECT group_id FROM Direct_Message_Group_Members WHERE group_id=? AND user_id=? LIMIT 1",
    [groupId, userId],
  );
  if (!membership[0]?.group_id) throw new Error("NOT_IN_GROUP");

  const [result] = await db.execute<ResultSetHeader>(
    "INSERT INTO Direct_Message_Group_Messages (group_id, sender_id, message, created_at) VALUES (?, ?, ?, NOW())",
    [groupId, userId, normalized],
  );
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT msg.id, msg.group_id, msg.sender_id, msg.message, msg.created_at,
            u.id AS user_id, u.username, u.nickname, u.avatar_url
     FROM Direct_Message_Group_Messages msg
     JOIN Users u ON u.id = msg.sender_id
     WHERE msg.id=? LIMIT 1`,
    [result.insertId],
  );
  return {
    id: Number(rows[0].id),
    groupId: Number(rows[0].group_id),
    senderId: Number(rows[0].sender_id),
    text: String(rows[0].message),
    createdAt: new Date(rows[0].created_at).toISOString(),
    sender: {
      id: Number(rows[0].user_id),
      username: String(rows[0].username),
      nickname: rows[0].nickname ? String(rows[0].nickname) : null,
      avatar_url: rows[0].avatar_url ? String(rows[0].avatar_url) : null,
    },
  };
}

export async function fetchGroupDetails(userId: number, groupId: number) {
  if (!isDatabaseConfigured()) return null;
  await ensureMessageTables();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT g.id, g.name, g.description, g.avatar_url, g.created_by
     FROM Direct_Message_Groups g
     JOIN Direct_Message_Group_Members gm ON gm.group_id = g.id
     WHERE g.id=? AND gm.user_id=?
     LIMIT 1`,
    [groupId, userId],
  );
  if (!rows[0]) return null;
  const [members] = await db.query<RowDataPacket[]>(
    `SELECT u.id, u.username, u.nickname, u.avatar_url
     FROM Direct_Message_Group_Members gm
     JOIN Users u ON u.id = gm.user_id
     WHERE gm.group_id = ?
     ORDER BY u.username ASC`,
    [groupId],
  );
  return {
    id: Number(rows[0].id),
    name: String(rows[0].name),
    description: rows[0].description ? String(rows[0].description) : null,
    avatar_url: rows[0].avatar_url ? String(rows[0].avatar_url) : null,
    createdBy: Number(rows[0].created_by),
    members: members.map((row) => ({
      id: Number(row.id),
      username: String(row.username),
      nickname: row.nickname ? String(row.nickname) : null,
      avatar_url: row.avatar_url ? String(row.avatar_url) : null,
    })),
  };
}

export async function updateGroupConversation(
  userId: number,
  groupId: number,
  payload: { name?: string; description?: string; avatarUrl?: string; addMemberIds?: number[]; removeMemberIds?: number[] },
) {
  if (!isDatabaseConfigured()) throw new Error("DB_REQUIRED");
  await ensureMessageTables();
  const [membership] = await db.query<RowDataPacket[]>(
    "SELECT group_id FROM Direct_Message_Group_Members WHERE group_id=? AND user_id=? LIMIT 1",
    [groupId, userId],
  );
  if (!membership[0]?.group_id) throw new Error("NOT_IN_GROUP");

  const normalizedName = typeof payload.name === "string" ? payload.name.trim().slice(0, 120) : undefined;
  const normalizedDescription = typeof payload.description === "string" ? payload.description.trim().slice(0, 255) : undefined;
  const normalizedAvatarUrl = typeof payload.avatarUrl === "string" ? payload.avatarUrl.trim().slice(0, 255) : undefined;

  if (normalizedName !== undefined && !normalizedName) throw new Error("INVALID_GROUP_NAME");

  if (normalizedName !== undefined || normalizedDescription !== undefined || normalizedAvatarUrl !== undefined) {
    await db.execute(
      `UPDATE Direct_Message_Groups
       SET name = COALESCE(?, name),
           description = CASE WHEN ? IS NULL THEN description ELSE ? END,
           avatar_url = CASE WHEN ? IS NULL THEN avatar_url ELSE ? END
       WHERE id = ?`,
      [normalizedName ?? null, normalizedDescription ?? null, normalizedDescription ?? null, normalizedAvatarUrl ?? null, normalizedAvatarUrl ?? null, groupId],
    );
  }

  const addMemberIds = [...new Set((payload.addMemberIds || []).filter((id) => Number.isFinite(id) && id > 0))];
  for (const memberId of addMemberIds) {
    await db.execute(
      "INSERT IGNORE INTO Direct_Message_Group_Members (group_id, user_id, last_read_message_id, joined_at) VALUES (?, ?, 0, NOW())",
      [groupId, memberId],
    );
  }

  const removeMemberIds = [...new Set((payload.removeMemberIds || []).filter((id) => Number.isFinite(id) && id > 0 && id !== userId))];
  for (const memberId of removeMemberIds) {
    await db.execute("DELETE FROM Direct_Message_Group_Members WHERE group_id=? AND user_id=?", [groupId, memberId]);
  }

  return fetchGroupDetails(userId, groupId);
}
