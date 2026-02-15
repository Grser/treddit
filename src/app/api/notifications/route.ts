export const runtime = "nodejs";

import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import {
  clearNotifications,
  getNotificationPreferences,
  markNotificationsRead,
  saveNotificationPreferences,
} from "@/lib/notifications";

type NotificationRow = RowDataPacket & {
  id: string;
  type: "follow" | "like" | "repost" | "ad" | "mention";
  created_at: string;
  username: string | null;
  nickname: string | null;
  post_id: number | null;
  text: string | null;
};

export async function GET() {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ items: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ items: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const preferences = await getNotificationPreferences(me.id);
  const [rows] = await db.query<NotificationRow[]>(
    `
    SELECT CONCAT('f-', f.follower, '-', f.followed) AS id, 'follow' AS type, f.created_at, u.username, u.nickname, NULL AS post_id, NULL AS text
    FROM Follows f
    JOIN Users u ON u.id = f.follower
    WHERE f.followed = ? AND ? = 1

    UNION ALL

    SELECT CONCAT('l-', lp.id) AS id, 'like' AS type, lp.date AS created_at, u.username, u.nickname, lp.post AS post_id, p.description AS text
    FROM Like_Posts lp
    JOIN Posts p ON p.id = lp.post
    JOIN Users u ON u.id = lp.user
    WHERE p.user = ? AND ? = 1

    UNION ALL

    SELECT CONCAT('r-', r.user_id, '-', r.post_id) AS id, 'repost' AS type, r.created_at, u.username, u.nickname, r.post_id AS post_id, p.description AS text
    FROM Reposts r
    JOIN Posts p ON p.id = r.post_id
    JOIN Users u ON u.id = r.user_id
    WHERE p.user = ? AND ? = 1

    UNION ALL

    SELECT CONCAT('a-', p.id) AS id, 'ad' AS type, p.created_at, u.username, u.nickname, p.id AS post_id, p.description AS text
    FROM Posts p
    JOIN Users u ON u.id = p.user
    WHERE p.user <> ?
      AND ? = 1
      AND p.user IN (SELECT followed FROM Follows WHERE follower = ?)
      AND (
        LOWER(COALESCE(p.description, '')) LIKE '%#ad%'
        OR LOWER(COALESCE(p.description, '')) LIKE '%#promocionado%'
        OR LOWER(COALESCE(p.description, '')) LIKE '%#sponsored%'
      )

    UNION ALL

    SELECT CONCAT('mp-', p.id) AS id, 'mention' AS type, p.created_at, u.username, u.nickname, p.id AS post_id, p.description AS text
    FROM Posts p
    JOIN Users u ON u.id = p.user
    WHERE p.user <> ?
      AND ? = 1
      AND LOWER(COALESCE(p.description, '')) LIKE CONCAT('%@', LOWER(?), '%')

    UNION ALL

    SELECT CONCAT('mc-', c.id) AS id, 'mention' AS type, c.created_at, u.username, u.nickname, c.post AS post_id, c.text AS text
    FROM Comments c
    JOIN Users u ON u.id = c.user
    WHERE c.user <> ?
      AND c.visible = 1
      AND ? = 1
      AND LOWER(COALESCE(c.text, '')) LIKE CONCAT('%@', LOWER(?), '%')

    HAVING (? IS NULL OR created_at >= ?)
    ORDER BY created_at DESC
    LIMIT 20
    `,
    [
      me.id,
      preferences.follows ? 1 : 0,
      me.id,
      preferences.likes ? 1 : 0,
      me.id,
      preferences.reposts ? 1 : 0,
      me.id,
      preferences.ads ? 1 : 0,
      me.id,
      me.id,
      preferences.mentions ? 1 : 0,
      me.username,
      me.id,
      preferences.mentions ? 1 : 0,
      me.username,
      preferences.clearedBefore,
      preferences.clearedBefore,
    ],
  );

  const unreadCount = rows.reduce((acc, item) => {
    if (!preferences.lastSeenAt) return acc + 1;
    return new Date(item.created_at).getTime() > new Date(preferences.lastSeenAt).getTime() ? acc + 1 : acc;
  }, 0);

  return NextResponse.json({ items: rows, unreadCount, preferences }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const me = await getSessionUser();
  if (!me || !isDatabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    preferences?: { follows?: boolean; likes?: boolean; reposts?: boolean; mentions?: boolean; ads?: boolean };
  };

  if (body.action === "mark-read") {
    await markNotificationsRead(me.id);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }

  if (body.action === "clear") {
    await clearNotifications(me.id);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }

  if (body.action === "preferences") {
    const prefs = body.preferences || {};
    await saveNotificationPreferences(me.id, {
      follows: Boolean(prefs.follows),
      likes: Boolean(prefs.likes),
      reposts: Boolean(prefs.reposts),
      mentions: Boolean(prefs.mentions),
      ads: Boolean(prefs.ads),
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ ok: false, message: "Unsupported action" }, { status: 400 });
}
