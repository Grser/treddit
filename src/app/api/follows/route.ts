import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { followSchema } from "@/lib/validators";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  const me = await requireUser();
  const body = await req.json();
  const parsed = followSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });

  const targetId = parsed.data.userId;
  if (targetId === me.id) return NextResponse.json({ error: "No puedes seguirte a ti mismo" }, { status: 400 });

  await db.execute(
    "INSERT IGNORE INTO Follows (follower, followed, visible, created_at) VALUES (?, ?, 1, NOW())",
    [me.id, targetId]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const me = await requireUser();
  const body = await req.json();
  const parsed = followSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });

  await db.execute(
    "DELETE FROM Follows WHERE follower=? AND followed=?",
    [me.id, parsed.data.userId]
  );
  return NextResponse.json({ ok: true });
}
