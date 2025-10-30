import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";
import { invalidateResetCodes, storeResetCode } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const [rows] = await db.execute<
    (RowDataPacket & { id: number; email: string; visible: number })[]
  >(
    "SELECT id, email, visible FROM Users WHERE email=? LIMIT 1",
    [normalizedEmail],
  );
  const user = rows[0];

  if (!user || user.visible === 0) {
    return NextResponse.json({ ok: true });
  }

  try {
    await invalidateResetCodes(user.id);
    const code = Math.floor(100000 + Math.random() * 900000)
      .toString()
      .padStart(6, "0");
    await storeResetCode(user.id, code);
    await sendPasswordResetEmail(user.email, code);
  } catch (err) {
    console.error("Error enviando código de recuperación", err);
    return NextResponse.json({ error: "No se pudo enviar el código" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
