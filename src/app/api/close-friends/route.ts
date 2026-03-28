export const runtime = "nodejs";

import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureCloseFriendsTable, listCloseFriends } from "@/lib/closeFriends";

type Body = {
  userId?: unknown;
};

type FollowingCandidateRow = RowDataPacket & {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  isClose: number;
};

export async function GET() {
  const me = await requireUser();
  await ensureCloseFriendsTable();
  const [rows] = await db.query<FollowingCandidateRow[]>(
    `
      SELECT
        u.id,
        u.username,
        u.nickname,
        u.avatar_url,
        EXISTS(
          SELECT 1
          FROM CloseFriends cf
          WHERE cf.user_id=? AND cf.friend_user_id=u.id
        ) AS isClose
      FROM Follows f
      JOIN Users u ON u.id = f.followed
      WHERE f.follower = ? AND u.visible = 1
      ORDER BY isClose DESC, u.username ASC
      LIMIT 300
    `,
    [me.id, me.id],
  );

  return NextResponse.json({
    items: rows.map((row) => ({
      id: Number(row.id),
      username: String(row.username),
      nickname: row.nickname ? String(row.nickname) : null,
      avatar_url: row.avatar_url ? String(row.avatar_url) : null,
      isClose: Boolean(row.isClose),
    })),
  });
}

export async function POST(req: Request) {
  const me = await requireUser();
  const body = (await req.json().catch(() => null)) as Body | null;
  const userId = Number(body?.userId ?? 0);
  if (!userId || userId === me.id) {
    return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
  }

  await ensureCloseFriendsTable();
  const [followRows] = await db.query<RowDataPacket[]>(
    "SELECT 1 FROM Follows WHERE follower=? AND followed=? LIMIT 1",
    [me.id, userId],
  );
  if (!followRows[0]) {
    return NextResponse.json({ error: "Solo puedes agregar personas que sigues" }, { status: 400 });
  }

  await db.execute(
    "INSERT IGNORE INTO CloseFriends (user_id, friend_user_id, created_at) VALUES (?, ?, NOW())",
    [me.id, userId],
  );

  return NextResponse.json({ ok: true, items: await listCloseFriends(me.id) });
}

export async function DELETE(req: Request) {
  const me = await requireUser();
  const body = (await req.json().catch(() => null)) as Body | null;
  const userId = Number(body?.userId ?? 0);
  if (!userId || userId === me.id) {
    return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
  }

  await ensureCloseFriendsTable();
  await db.execute("DELETE FROM CloseFriends WHERE user_id=? AND friend_user_id=?", [me.id, userId]);

  return NextResponse.json({ ok: true, items: await listCloseFriends(me.id) });
}
