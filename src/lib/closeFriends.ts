import type { RowDataPacket } from "mysql2";

import { db } from "@/lib/db";

type CloseFriendRow = RowDataPacket & {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
};

let ensured = false;

export async function ensureCloseFriendsTable() {
  if (ensured) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS CloseFriends (
      user_id INT NOT NULL,
      friend_user_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, friend_user_id),
      INDEX idx_close_friends_friend (friend_user_id),
      CONSTRAINT fk_close_friends_user
        FOREIGN KEY (user_id) REFERENCES Users(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_close_friends_friend
        FOREIGN KEY (friend_user_id) REFERENCES Users(id)
        ON DELETE CASCADE
    )
  `);
  ensured = true;
}

export async function isCloseFriend(userId: number, friendUserId: number) {
  await ensureCloseFriendsTable();
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT 1 FROM CloseFriends WHERE user_id=? AND friend_user_id=? LIMIT 1",
    [userId, friendUserId],
  );
  return Boolean(rows[0]);
}

export async function listCloseFriends(userId: number) {
  await ensureCloseFriendsTable();
  const [rows] = await db.query<CloseFriendRow[]>(
    `
      SELECT u.id, u.username, u.nickname, u.avatar_url
      FROM CloseFriends cf
      JOIN Users u ON u.id = cf.friend_user_id
      WHERE cf.user_id = ?
      ORDER BY cf.created_at DESC, u.username ASC
    `,
    [userId],
  );

  return rows.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    nickname: row.nickname ? String(row.nickname) : null,
    avatar_url: row.avatar_url ? String(row.avatar_url) : null,
  }));
}
