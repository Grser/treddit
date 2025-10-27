import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const me = await getSessionUser();
  const meId = me?.id ?? 0;

  const [rows] = await db.query(
    `SELECT u.id, u.username, u.nickname, COALESCE(cnt.c,0) as followers
     FROM Users u
     LEFT JOIN (
       SELECT followed as uid, COUNT(*) as c FROM Follows GROUP BY followed
     ) cnt ON cnt.uid = u.id
     WHERE u.visible=1 AND u.id <> ?
       AND NOT EXISTS (SELECT 1 FROM Follows f WHERE f.follower=? AND f.followed=u.id)
     ORDER BY followers DESC, u.created_at DESC
     LIMIT 5`,
    [meId, meId]
  );
  return NextResponse.json({ items: rows });
}
