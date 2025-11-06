export const runtime = "nodejs";

import type { RowDataPacket } from "mysql2";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { compare } from "bcryptjs";
import { signSession } from "@/lib/auth";

type LoginRequestBody = {
  email?: unknown;
  password?: unknown;
};

type LoginUserRow = RowDataPacket & {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  password: string;
  is_admin: number;
  is_verified: number;
};

export async function POST(req: Request) {
  const rawBody = (await req.json().catch(() => null)) as LoginRequestBody | null;
  const email = typeof rawBody?.email === "string" ? rawBody.email : "";
  const password = typeof rawBody?.password === "string" ? rawBody.password : "";
  if (!email || !password) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

  const [rows] = await db.execute<LoginUserRow[]>(
    "SELECT id, username, email, avatar_url, password, is_admin, is_verified FROM Users WHERE email=? AND visible=1",
    [email]
  );
  const user = rows[0];
  if (!user) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

  const ok = await compare(password, user.password);
  if (!ok) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

  const token = signSession({
    id: user.id,
    username: user.username,
    email: user.email,
    avatar_url: user.avatar_url ?? null,
    is_admin: Boolean(user.is_admin),
    is_verified: Boolean(user.is_verified),
  });
  const res = NextResponse.json({ ok: true });
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set("treddit_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
