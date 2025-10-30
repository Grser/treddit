export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";
import {
  cleanupOldResetCodes,
  findValidResetCode,
  hashResetCode,
  markResetCodeUsed,
} from "@/lib/password-reset";

export async function POST(req: Request) {
  const { email, code, password } = (await req.json().catch(() => ({}))) as {
    email?: string;
    code?: string;
    password?: string;
  };

  const normalizedEmail = email?.trim().toLowerCase();
  const sanitizedCode = code?.trim();
  const newPassword = password?.trim();

  if (!normalizedEmail || !sanitizedCode || !newPassword) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  if (!/^\d{6}$/.test(sanitizedCode)) {
    return NextResponse.json({ error: "Código inválido o expirado" }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  const [rows] = await db.execute<
    (RowDataPacket & { id: number; email: string; visible: number })[]
  >(
    "SELECT id, email, visible FROM Users WHERE email=? LIMIT 1",
    [normalizedEmail],
  );
  const user = rows[0];
  if (!user || user.visible === 0) {
    return NextResponse.json({ error: "Código inválido o expirado" }, { status: 400 });
  }

  const record = await findValidResetCode(user.id);
  if (!record || record.code_hash !== hashResetCode(sanitizedCode)) {
    return NextResponse.json({ error: "Código inválido o expirado" }, { status: 400 });
  }

  const passwordHash = await hash(newPassword, 10);
  await db.execute("UPDATE Users SET password=? WHERE id=?", [passwordHash, user.id]);
  await markResetCodeUsed(record.id);
  await cleanupOldResetCodes(user.id);

  return NextResponse.json({ ok: true });
}
