import type { RowDataPacket } from "mysql2";

import { db } from "@/lib/db";

export type NotificationPreferences = {
  follows: boolean;
  likes: boolean;
  reposts: boolean;
  mentions: boolean;
  ads: boolean;
  lastSeenAt: string | null;
  clearedBefore: string | null;
};

type NotificationPreferenceRow = RowDataPacket & {
  receive_follows: number;
  receive_likes: number;
  receive_reposts: number;
  receive_mentions: number;
  receive_ads: number;
  last_seen_at: string | null;
  cleared_before: string | null;
};

let ensured = false;

export async function ensureNotificationPreferencesTable() {
  if (ensured) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS User_Notification_Preferences (
      user_id INT NOT NULL PRIMARY KEY,
      receive_follows TINYINT(1) NOT NULL DEFAULT 1,
      receive_likes TINYINT(1) NOT NULL DEFAULT 1,
      receive_reposts TINYINT(1) NOT NULL DEFAULT 1,
      receive_mentions TINYINT(1) NOT NULL DEFAULT 1,
      receive_ads TINYINT(1) NOT NULL DEFAULT 1,
      last_seen_at DATETIME NULL,
      cleared_before DATETIME NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  ensured = true;
}

export async function getNotificationPreferences(userId: number): Promise<NotificationPreferences> {
  await ensureNotificationPreferencesTable();

  const [rows] = await db.query<NotificationPreferenceRow[]>(
    `SELECT receive_follows, receive_likes, receive_reposts, receive_mentions, receive_ads, last_seen_at, cleared_before
     FROM User_Notification_Preferences
     WHERE user_id = ?
     LIMIT 1`,
    [userId],
  );

  const row = rows[0];
  if (!row) {
    return {
      follows: true,
      likes: true,
      reposts: true,
      mentions: true,
      ads: true,
      lastSeenAt: null,
      clearedBefore: null,
    };
  }

  return {
    follows: Boolean(row.receive_follows),
    likes: Boolean(row.receive_likes),
    reposts: Boolean(row.receive_reposts),
    mentions: Boolean(row.receive_mentions),
    ads: Boolean(row.receive_ads),
    lastSeenAt: row.last_seen_at,
    clearedBefore: row.cleared_before,
  };
}

export async function saveNotificationPreferences(userId: number, prefs: Pick<NotificationPreferences, "follows" | "likes" | "reposts" | "mentions" | "ads">) {
  await ensureNotificationPreferencesTable();
  await db.execute(
    `INSERT INTO User_Notification_Preferences
      (user_id, receive_follows, receive_likes, receive_reposts, receive_mentions, receive_ads)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      receive_follows = VALUES(receive_follows),
      receive_likes = VALUES(receive_likes),
      receive_reposts = VALUES(receive_reposts),
      receive_mentions = VALUES(receive_mentions),
      receive_ads = VALUES(receive_ads)`,
    [userId, prefs.follows ? 1 : 0, prefs.likes ? 1 : 0, prefs.reposts ? 1 : 0, prefs.mentions ? 1 : 0, prefs.ads ? 1 : 0],
  );
}

export async function markNotificationsRead(userId: number) {
  await ensureNotificationPreferencesTable();
  await db.execute(
    `INSERT INTO User_Notification_Preferences (user_id, last_seen_at)
     VALUES (?, NOW())
     ON DUPLICATE KEY UPDATE last_seen_at = NOW()`,
    [userId],
  );
}

export async function clearNotifications(userId: number) {
  await ensureNotificationPreferencesTable();
  await db.execute(
    `INSERT INTO User_Notification_Preferences (user_id, cleared_before, last_seen_at)
     VALUES (?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE cleared_before = NOW(), last_seen_at = NOW()`,
    [userId],
  );
}
