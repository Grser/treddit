import type { RowDataPacket } from "mysql2";

import { NextResponse } from "next/server";

import { db, isDatabaseConfigured } from "@/lib/db";
import { getDemoRecommendedUsers } from "@/lib/demoStore";

type UserPreviewRow = RowDataPacket & {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  description: string | null;
  followers: number;
  following: number;
  is_admin: number;
  is_verified: number;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = (searchParams.get("username") || "").trim().replace(/^@+/, "").slice(0, 50);

  if (!username) {
    return NextResponse.json({ error: "username requerido" }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    const demoUser = getDemoRecommendedUsers(null).find(
      (item) => item.username.toLowerCase() === username.toLowerCase(),
    );

    if (!demoUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      item: {
        id: demoUser.id,
        username: demoUser.username,
        nickname: demoUser.nickname,
        avatar_url: demoUser.avatar_url,
        banner_url: "/demo-x.png",
        description: "Perfil de demostración",
        followers: 0,
        following: 0,
        is_admin: demoUser.is_admin,
        is_verified: demoUser.is_verified,
      },
    });
  }

  const [rows] = await db.query<UserPreviewRow[]>(
    `
    SELECT
      u.id,
      u.username,
      u.nickname,
      u.avatar_url,
      u.banner_url,
      u.description,
      (SELECT COUNT(*) FROM Follows f WHERE f.followed = u.id) AS followers,
      (SELECT COUNT(*) FROM Follows f WHERE f.follower = u.id) AS following,
      u.is_admin,
      u.is_verified
    FROM Users u
    WHERE u.username = ? AND u.visible = 1
    LIMIT 1
    `,
    [username],
  );

  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    item: {
      id: Number(user.id),
      username: String(user.username),
      nickname: user.nickname ? String(user.nickname) : null,
      avatar_url: user.avatar_url ? String(user.avatar_url) : null,
      banner_url: user.banner_url ? String(user.banner_url) : null,
      description: user.description ? String(user.description) : null,
      followers: Number(user.followers) || 0,
      following: Number(user.following) || 0,
      is_admin: Boolean(user.is_admin),
      is_verified: Boolean(user.is_verified),
    },
  });
}
