import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { db, isDatabaseConfigured } from "@/lib/db";

export type StoryItem = {
  id: number;
  userId: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  content: string | null;
  media_url: string;
  created_at: string;
};

export type NoteItem = {
  id: number;
  userId: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  content: string;
  song_title: string | null;
  song_artist: string | null;
  song_url: string | null;
  created_at: string;
};

type StoryRow = RowDataPacket & {
  id: number;
  user_id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  content: string | null;
  media_url: string;
  created_at: string | Date;
};

type NoteRow = RowDataPacket & {
  id: number;
  user_id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  content: string;
  song_title: string | null;
  song_artist: string | null;
  song_url: string | null;
  created_at: string | Date;
};

let schemaEnsured = false;

export async function ensureStoriesNotesTables() {
  if (!isDatabaseConfigured() || schemaEnsured) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS Stories (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT(10) UNSIGNED NOT NULL,
      content VARCHAR(220) NULL,
      media_url VARCHAR(500) NOT NULL,
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
      song_title VARCHAR(120) NULL,
      song_artist VARCHAR(120) NULL,
      song_url VARCHAR(500) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      KEY idx_user_notes_user_id (user_id),
      KEY idx_user_notes_expires_at (expires_at),
      CONSTRAINT fk_user_notes_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute("ALTER TABLE Stories ADD COLUMN media_url VARCHAR(500) NOT NULL DEFAULT ''").catch(() => undefined);
  await db.execute("ALTER TABLE Stories MODIFY COLUMN content VARCHAR(220) NULL").catch(() => undefined);

  await db.execute("ALTER TABLE User_Notes ADD COLUMN song_title VARCHAR(120) NULL").catch(() => undefined);
  await db.execute("ALTER TABLE User_Notes ADD COLUMN song_artist VARCHAR(120) NULL").catch(() => undefined);
  await db.execute("ALTER TABLE User_Notes ADD COLUMN song_url VARCHAR(500) NULL").catch(() => undefined);

  schemaEnsured = true;
}

export async function createStory(userId: number, params: { content?: string | null; media_url: string }) {
  if (!isDatabaseConfigured()) return null;
  await ensureStoriesNotesTables();

  await db.execute("DELETE FROM Stories WHERE user_id=?", [userId]);
  const [insertResult] = await db.execute<ResultSetHeader>(
    "INSERT INTO Stories (user_id, content, media_url, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))",
    [userId, params.content || null, params.media_url],
  );
  return insertResult.insertId;
}

export async function createUserNote(
  userId: number,
  params: { content: string; song_title?: string | null; song_artist?: string | null; song_url?: string | null },
) {
  if (!isDatabaseConfigured()) return null;
  await ensureStoriesNotesTables();

  await db.execute("DELETE FROM User_Notes WHERE user_id=?", [userId]);
  const [insertResult] = await db.execute<ResultSetHeader>(
    "INSERT INTO User_Notes (user_id, content, song_title, song_artist, song_url, expires_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))",
    [userId, params.content, params.song_title || null, params.song_artist || null, params.song_url || null],
  );
  return insertResult.insertId;
}

export async function deleteStoryByUser(userId: number) {
  if (!isDatabaseConfigured()) return 0;
  await ensureStoriesNotesTables();
  const [res] = await db.execute<ResultSetHeader>("DELETE FROM Stories WHERE user_id=?", [userId]);
  return res.affectedRows;
}

export async function deleteNoteByUser(userId: number) {
  if (!isDatabaseConfigured()) return 0;
  await ensureStoriesNotesTables();
  const [res] = await db.execute<ResultSetHeader>("DELETE FROM User_Notes WHERE user_id=?", [userId]);
  return res.affectedRows;
}

export async function loadActiveStories(limit = 12): Promise<StoryItem[]> {
  if (!isDatabaseConfigured()) return [];
  await ensureStoriesNotesTables();

  await db.execute("DELETE FROM Stories WHERE expires_at <= NOW()");

  const [rows] = await db.query<StoryRow[]>(
    `
    SELECT s.id, s.user_id, s.content, s.media_url, s.created_at, u.username, u.nickname, u.avatar_url
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
    media_url: row.media_url,
    created_at: new Date(row.created_at).toISOString(),
  }));
}

export async function loadActiveNotes(limit = 12): Promise<NoteItem[]> {
  if (!isDatabaseConfigured()) return [];
  await ensureStoriesNotesTables();

  await db.execute("DELETE FROM User_Notes WHERE expires_at <= NOW()");

  const [rows] = await db.query<NoteRow[]>(
    `
    SELECT n.id, n.user_id, n.content, n.song_title, n.song_artist, n.song_url, n.created_at, u.username, u.nickname, u.avatar_url
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
    song_title: row.song_title,
    song_artist: row.song_artist,
    song_url: row.song_url,
    created_at: new Date(row.created_at).toISOString(),
  }));
}
