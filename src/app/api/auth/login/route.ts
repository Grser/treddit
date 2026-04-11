export const runtime = "nodejs";

import type { RowDataPacket } from "mysql2";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { compare } from "bcryptjs";
import { signSession } from "@/lib/auth";
import { verifyCaptchaToken } from "@/lib/captcha";
import {
  generateTwoFactorCode,
  invalidateTwoFactorCodes,
  isTwoFactorEnabled,
  storeTwoFactorCode,
} from "@/lib/two-factor";
import { sendLoginTwoFactorEmail } from "@/lib/mail";

type LoginRequestBody = {
  email?: unknown;
  password?: unknown;
  captchaToken?: unknown;
  captchaAnswer?: unknown;
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

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visibleLocal = local.length <= 2 ? `${local[0] ?? ""}*` : `${local.slice(0, 2)}***`;
  return `${visibleLocal}@${domain}`;
}

export async function POST(req: Request) {
  const rawBody = (await req.json().catch(() => null)) as LoginRequestBody | null;
  const email =
    typeof rawBody?.email === "string"
      ? rawBody.email.trim().toLowerCase()
      : "";
  const password =
    typeof rawBody?.password === "string" ? rawBody.password.trim() : "";
  const captchaToken = typeof rawBody?.captchaToken === "string" ? rawBody.captchaToken : "";
  const captchaAnswer = typeof rawBody?.captchaAnswer === "string" ? rawBody.captchaAnswer : "";

  if (!email || !password || !captchaToken || !captchaAnswer) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  if (!verifyCaptchaToken(captchaToken, captchaAnswer)) {
    return NextResponse.json({ error: "Captcha inválido o vencido" }, { status: 400 });
  }

  const [rows] = await db.execute<LoginUserRow[]>(
    "SELECT id, username, email, avatar_url, password, is_admin, is_verified FROM Users WHERE email=? AND visible=1",
    [email]
  );
  const user = rows[0];
  if (!user) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

  const ok = await compare(password, user.password);
  if (!ok) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

  const twoFactorEnabled = await isTwoFactorEnabled(user.id);
  if (twoFactorEnabled) {
    const code = generateTwoFactorCode();
    await invalidateTwoFactorCodes(user.id);
    await storeTwoFactorCode(user.id, code);
    await sendLoginTwoFactorEmail(user.email, code);
    return NextResponse.json({
      ok: true,
      requiresTwoFactor: true,
      email,
      emailHint: maskEmail(user.email),
      message: "Enviamos un código de verificación a tu correo.",
    });
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
