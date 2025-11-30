export const runtime = "nodejs";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";

type RegisterRequestBody = {
  username?: unknown;
  nickname?: unknown;
  email?: unknown;
  password?: unknown;
};

export async function POST(req: Request) {
  const rawBody = (await req.json().catch(() => null)) as RegisterRequestBody | null;
  const username =
    typeof rawBody?.username === "string" ? rawBody.username.trim() : "";
  const nickname =
    typeof rawBody?.nickname === "string" ? rawBody.nickname.trim() : "";
  const email =
    typeof rawBody?.email === "string"
      ? rawBody.email.trim().toLowerCase()
      : "";
  const password =
    typeof rawBody?.password === "string" ? rawBody.password.trim() : "";

  if (!username || !nickname || !email || !password) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const [exists] = await db.execute<RowDataPacket[]>(
    "SELECT 1 FROM Users WHERE username=? OR email=? LIMIT 1",
    [username, email]
  );
  if (exists.length) {
    return NextResponse.json({ error: "Usuario o email ya en uso" }, { status: 409 });
  }

  const passwordHash = await hash(password, 10);
  const [result] = await db.execute<ResultSetHeader>(
    "INSERT INTO Users (username, nickname, email, password, created_at, visible) VALUES (?, ?, ?, ?, NOW(), 1)",
    [username, nickname, email, passwordHash]
  );

  return NextResponse.json({ ok: true, id: Number(result.insertId) });
}
