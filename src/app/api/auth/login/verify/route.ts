export const runtime = "nodejs";

import type { RowDataPacket } from "mysql2";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signSession } from "@/lib/auth";
import { validateTwoFactorCode } from "@/lib/two-factor";

type VerifyRequestBody = {
  email?: unknown;
  code?: unknown;
};

type LoginUserRow = RowDataPacket & {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  is_admin: number;
  is_verified: number;
};

export async function POST(req: Request) {
  const rawBody = (await req.json().catch(() => null)) as VerifyRequestBody | null;
  const email = typeof rawBody?.email === "string" ? rawBody.email.trim().toLowerCase() : "";
  const code = typeof rawBody?.code === "string" ? rawBody.code.replace(/\D/g, "") : "";

  if (!email || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  const [rows] = await db.execute<LoginUserRow[]>(
    "SELECT id, username, email, avatar_url, is_admin, is_verified FROM Users WHERE email=? AND visible=1 LIMIT 1",
    [email],
  );
  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  const isValid = await validateTwoFactorCode(user.id, code);
  if (!isValid) {
    return NextResponse.json({ error: "Código inválido o expirado" }, { status: 400 });
  }

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
