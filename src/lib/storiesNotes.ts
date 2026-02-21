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
  viewed_by_me?: boolean;
  viewers?: {
    id: number;
    username: string;
    nickname: string | null;
    avatar_url: string | null;
    viewed_at: string;
  }[];
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
  song_lyrics: string | null;
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
  song_lyrics: string | null;
  created_at: string | Date;
};

type StoryViewRow = RowDataPacket & {
  story_id: number;
  viewer_id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  viewed_at: string | Date;
};

type ViewerStoryRow = RowDataPacket & {
  story_id: number;
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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS Story_Views (
      story_id INT UNSIGNED NOT NULL,
      viewer_id INT(10) UNSIGNED NOT NULL,
      viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (story_id, viewer_id),
      KEY idx_story_views_viewer_id (viewer_id),
      KEY idx_story_views_viewed_at (viewed_at),
      CONSTRAINT fk_story_views_story FOREIGN KEY (story_id) REFERENCES Stories(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_story_views_user FOREIGN KEY (viewer_id) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute("ALTER TABLE User_Notes ADD COLUMN song_title VARCHAR(120) NULL").catch(() => undefined);
  await db.execute("ALTER TABLE User_Notes ADD COLUMN song_artist VARCHAR(120) NULL").catch(() => undefined);
  await db.execute("ALTER TABLE User_Notes ADD COLUMN song_url VARCHAR(500) NULL").catch(() => undefined);
  await db.execute("ALTER TABLE User_Notes ADD COLUMN song_lyrics TEXT NULL").catch(() => undefined);

  schemaEnsured = true;
}

export async function createStory(userId: number, params: { content?: string | null; media_url: string }) {
  if (!isDatabaseConfigured()) return null;
  await ensureStoriesNotesTables();

  const [insertResult] = await db.execute<ResultSetHeader>(
    "INSERT INTO Stories (user_id, content, media_url, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))",
    [userId, params.content || null, params.media_url],
  );
  return insertResult.insertId;
}

export async function createUserNote(
  userId: number,
  params: { content: string; song_title?: string | null; song_artist?: string | null; song_url?: string | null; song_lyrics?: string | null },
) {
  if (!isDatabaseConfigured()) return null;
  await ensureStoriesNotesTables();

  const [insertResult] = await db.execute<ResultSetHeader>(
    "INSERT INTO User_Notes (user_id, content, song_title, song_artist, song_url, song_lyrics, expires_at) VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))",
    [userId, params.content, params.song_title || null, params.song_artist || null, params.song_url || null, params.song_lyrics || null],
  );
  return insertResult.insertId;
}

export async function deleteStoryByUser(userId: number) {
  if (!isDatabaseConfigured()) return 0;
  await ensureStoriesNotesTables();
  const [res] = await db.execute<ResultSetHeader>("DELETE FROM Stories WHERE user_id=?", [userId]);
  return res.affectedRows;
}

export async function deleteStoryById(userId: number, storyId: number) {
  if (!isDatabaseConfigured()) return 0;
  await ensureStoriesNotesTables();
  const [res] = await db.execute<ResultSetHeader>("DELETE FROM Stories WHERE user_id=? AND id=? LIMIT 1", [userId, storyId]);
  return res.affectedRows;
}

export async function registerStoryView(storyId: number, viewerId: number) {
  if (!isDatabaseConfigured()) return false;
  await ensureStoriesNotesTables();

  const [res] = await db.execute<ResultSetHeader>(
    `
    INSERT INTO Story_Views (story_id, viewer_id)
    SELECT s.id, ?
    FROM Stories s
    WHERE s.id = ?
      AND s.expires_at > NOW()
      AND s.user_id <> ?
      AND (
        s.user_id = ?
        OR EXISTS (
          SELECT 1
          FROM Follows f
          WHERE f.follower = ?
            AND f.followed = s.user_id
        )
      )
    ON DUPLICATE KEY UPDATE viewed_at = CURRENT_TIMESTAMP
    `,
    [viewerId, storyId, viewerId, viewerId, viewerId],
  );

  return res.affectedRows > 0;
}

export async function deleteNoteByUser(userId: number) {
  if (!isDatabaseConfigured()) return 0;
  await ensureStoriesNotesTables();
  const [res] = await db.execute<ResultSetHeader>("DELETE FROM User_Notes WHERE user_id=?", [userId]);
  return res.affectedRows;
}

export async function loadActiveStories(limit = 24, viewerId?: number | null): Promise<StoryItem[]> {
  if (!isDatabaseConfigured()) return [];
  await ensureStoriesNotesTables();

  await db.execute("DELETE FROM Stories WHERE expires_at <= NOW()");

  const [rows] = await db.query<StoryRow[]>(
    `
    SELECT s.id, s.user_id, s.content, s.media_url, s.created_at, u.username, u.nickname, u.avatar_url
    FROM Stories s
    JOIN Users u ON u.id = s.user_id
    WHERE s.expires_at > NOW()
      AND (
        u.visible = 1
        OR (? IS NOT NULL AND s.user_id = ?)
      )
      AND (
        ? IS NULL
        OR s.user_id = ?
        OR EXISTS (
          SELECT 1
          FROM Follows f
          WHERE f.follower = ?
            AND f.followed = s.user_id
        )
      )
    ORDER BY s.created_at ASC
    LIMIT ?
    `,
    [viewerId ?? null, viewerId ?? null, viewerId ?? null, viewerId ?? null, viewerId ?? null, limit],
  );

  const items = rows.map((row) => ({
    id: Number(row.id),
    userId: Number(row.user_id),
    username: row.username,
    nickname: row.nickname,
    avatar_url: row.avatar_url,
    content: row.content,
    media_url: row.media_url,
    created_at: new Date(row.created_at).toISOString(),
  }));

  if (!viewerId) return items;

  const visibleStoryIds = items.filter((item) => item.userId !== viewerId).map((item) => item.id);
  const viewedStoryIds = new Set<number>();
  if (visibleStoryIds.length > 0) {
    const placeholders = visibleStoryIds.map(() => "?").join(", ");
    const [viewerRows] = await db.query<ViewerStoryRow[]>(
      `
      SELECT story_id
      FROM Story_Views
      WHERE viewer_id = ?
        AND story_id IN (${placeholders})
      `,
      [viewerId, ...visibleStoryIds],
    );
    viewerRows.forEach((row) => viewedStoryIds.add(Number(row.story_id)));
  }

  const ownStoryIds = items.filter((item) => item.userId === viewerId).map((item) => item.id);
  if (ownStoryIds.length === 0) {
    return items.map((item) => ({
      ...item,
      viewed_by_me: item.userId === viewerId ? true : viewedStoryIds.has(item.id),
    }));
  }

  const placeholders = ownStoryIds.map(() => "?").join(", ");
  const [viewRows] = await db.query<StoryViewRow[]>(
    `
    SELECT sv.story_id, sv.viewer_id, sv.viewed_at, u.username, u.nickname, u.avatar_url
    FROM Story_Views sv
    JOIN Users u ON u.id = sv.viewer_id
    WHERE sv.story_id IN (${placeholders})
    ORDER BY sv.viewed_at DESC
    `,
    ownStoryIds,
  );

  const viewersByStoryId = new Map<number, StoryItem["viewers"]>();
  for (const row of viewRows) {
    const storyId = Number(row.story_id);
    const current = viewersByStoryId.get(storyId) || [];
    current.push({
      id: Number(row.viewer_id),
      username: row.username,
      nickname: row.nickname,
      avatar_url: row.avatar_url,
      viewed_at: new Date(row.viewed_at).toISOString(),
    });
    viewersByStoryId.set(storyId, current);
  }

  return items.map((item) => ({
    ...item,
    viewers: item.userId === viewerId ? viewersByStoryId.get(item.id) || [] : undefined,
    viewed_by_me: item.userId === viewerId ? true : viewedStoryIds.has(item.id),
  }));
}

export async function loadActiveNotes(limit = 24, viewerId?: number | null): Promise<NoteItem[]> {
  if (!isDatabaseConfigured()) return [];
  await ensureStoriesNotesTables();

  await db.execute("DELETE FROM User_Notes WHERE expires_at <= NOW()");

  const [rows] = await db.query<NoteRow[]>(
    `
    SELECT n.id, n.user_id, n.content, n.song_title, n.song_artist, n.song_url, n.song_lyrics, n.created_at, u.username, u.nickname, u.avatar_url
    FROM User_Notes n
    JOIN Users u ON u.id = n.user_id
    WHERE n.expires_at > NOW()
      AND (
        u.visible = 1
        OR (? IS NOT NULL AND n.user_id = ?)
      )
      AND (
        ? IS NULL
        OR n.user_id = ?
        OR EXISTS (
          SELECT 1
          FROM Follows f
          WHERE f.follower = ?
            AND f.followed = n.user_id
        )
      )
    ORDER BY n.created_at DESC
    LIMIT ?
    `,
    [viewerId ?? null, viewerId ?? null, viewerId ?? null, viewerId ?? null, viewerId ?? null, limit],
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
    song_lyrics: row.song_lyrics,
    created_at: new Date(row.created_at).toISOString(),
  }));
}
