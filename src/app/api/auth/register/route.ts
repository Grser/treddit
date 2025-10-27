export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  const { username, nickname, email, password } = await req.json().catch(() => ({}));

  if (!username || !nickname || !email || !password) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const [exists] = await db.execute(
    "SELECT 1 FROM Users WHERE username=? OR email=? LIMIT 1",
    [username, email]
  );
  if ((exists as any[]).length) {
    return NextResponse.json({ error: "Usuario o email ya en uso" }, { status: 409 });
  }

  const passwordHash = await hash(password, 10);
  const [result] = await db.execute(
    "INSERT INTO Users (username, nickname, email, password, created_at, visible) VALUES (?, ?, ?, ?, NOW(), 1)",
    [username, nickname, email, passwordHash]
  );

  return NextResponse.json({ ok: true, id: (result as any).insertId });
}
