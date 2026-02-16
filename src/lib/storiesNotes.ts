import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { db, isDatabaseConfigured } from "@/lib/db";

export type StoryItem = {
  id: number;
  userId: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  content: string;
  created_at: string;
};

export type NoteItem = {
  id: number;
  userId: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  content: string;
  created_at: string;
};

type StoryRow = RowDataPacket & {
  id: number;
  user_id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  content: string;
  created_at: string | Date;
};

type NoteRow = StoryRow;

let schemaEnsured = false;

export async function ensureStoriesNotesTables() {
  if (!isDatabaseConfigured() || schemaEnsured) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS Stories (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT(10) UNSIGNED NOT NULL,
      content VARCHAR(220) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      KEY idx_stories_user_id (user_id),
      KEY idx_stories_expires_at (expires_at),
      CONSTRAINT fk_stories_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS User_Notes (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT(10) UNSIGNED NOT NULL,
      content VARCHAR(180) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      KEY idx_user_notes_user_id (user_id),
      KEY idx_user_notes_expires_at (expires_at),
      CONSTRAINT fk_user_notes_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  schemaEnsured = true;
}

export async function createStory(userId: number, content: string) {
  if (!isDatabaseConfigured()) return null;
  await ensureStoriesNotesTables();

  await db.execute("DELETE FROM Stories WHERE user_id=?", [userId]);
  const [insertResult] = await db.execute<ResultSetHeader>(
    "INSERT INTO Stories (user_id, content, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))",
    [userId, content],
  );
  return insertResult.insertId;
}

export async function createUserNote(userId: number, content: string) {
  if (!isDatabaseConfigured()) return null;
  await ensureStoriesNotesTables();

  await db.execute("DELETE FROM User_Notes WHERE user_id=?", [userId]);
  const [insertResult] = await db.execute<ResultSetHeader>(
    "INSERT INTO User_Notes (user_id, content, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))",
    [userId, content],
  );
  return insertResult.insertId;
}

export async function loadActiveStories(limit = 12): Promise<StoryItem[]> {
  if (!isDatabaseConfigured()) return [];
  await ensureStoriesNotesTables();

  await db.execute("DELETE FROM Stories WHERE expires_at <= NOW()");

  const [rows] = await db.query<StoryRow[]>(
    `
    SELECT s.id, s.user_id, s.content, s.created_at, u.username, u.nickname, u.avatar_url
    FROM Stories s
    JOIN Users u ON u.id = s.user_id
    WHERE s.expires_at > NOW() AND u.visible = 1
    ORDER BY s.created_at DESC
    LIMIT ?
    `,
    [limit],
  );

  return rows.map((row) => ({
    id: Number(row.id),
    userId: Number(row.user_id),
    username: row.username,
    nickname: row.nickname,
    avatar_url: row.avatar_url,
    content: row.content,
    created_at: new Date(row.created_at).toISOString(),
  }));
}

export async function loadActiveNotes(limit = 12): Promise<NoteItem[]> {
  if (!isDatabaseConfigured()) return [];
  await ensureStoriesNotesTables();

  await db.execute("DELETE FROM User_Notes WHERE expires_at <= NOW()");

  const [rows] = await db.query<NoteRow[]>(
    `
    SELECT n.id, n.user_id, n.content, n.created_at, u.username, u.nickname, u.avatar_url
    FROM User_Notes n
    JOIN Users u ON u.id = n.user_id
    WHERE n.expires_at > NOW() AND u.visible = 1
    ORDER BY n.created_at DESC
    LIMIT ?
    `,
    [limit],
  );

  return rows.map((row) => ({
    id: Number(row.id),
    userId: Number(row.user_id),
    username: row.username,
    nickname: row.nickname,
    avatar_url: row.avatar_url,
    content: row.content,
    created_at: new Date(row.created_at).toISOString(),
  }));
}
