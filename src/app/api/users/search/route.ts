import type { RowDataPacket } from "mysql2";

import { NextResponse } from "next/server";

import { db, isDatabaseConfigured } from "@/lib/db";
import { getDemoRecommendedUsers } from "@/lib/demoStore";

function likeEscape(term: string) {
  return term.replace(/[\\_%]/g, (char) => `\\${char}`);
}

type UserSearchRow = RowDataPacket & {
  id: number;
  username: string;
  nickname: string | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").trim().replace(/^@+/, "").slice(0, 50);

  if (!query) {
    return NextResponse.json({ items: [] });
  }

  if (!isDatabaseConfigured()) {
    const normalized = query.toLowerCase();
    const items = getDemoRecommendedUsers(null)
      .filter((user) => {
        const haystack = `${user.username} ${user.nickname ?? ""}`.toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 8)
      .map((user) => ({
        id: user.id,
        username: user.username,
        nickname: user.nickname,
      }));
    return NextResponse.json({ items });
  }

  const like = `%${likeEscape(query)}%`;
  const [rows] = await db.query<UserSearchRow[]>(
    `
    SELECT u.id, u.username, u.nickname
    FROM Users u
    WHERE u.visible = 1 AND (u.username LIKE ? OR u.nickname LIKE ?)
    ORDER BY
      CASE WHEN u.username LIKE ? THEN 0 ELSE 1 END,
      u.username ASC
    LIMIT 8
    `,
    [like, like, `${query}%`]
  );

  return NextResponse.json({
    items: rows.map((row) => ({
      id: Number(row.id),
      username: String(row.username),
      nickname: row.nickname ? String(row.nickname) : null,
    })),
  });
}
